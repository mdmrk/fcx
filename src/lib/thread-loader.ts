import { logger } from "@/utils/logger"
import type { SelectorConfig } from "@/types/adapter"
import { currentPageType } from "@/utils/page-state"
import { PageType } from "@/types/page-state"
import { getConfig } from "@/utils/storage"
import { CONFIG_KEYS } from "@/config-registry"

// Threads with more remaining pages than this are loaded progressively (on
// scroll) instead of all at once, to avoid a flood of requests and a huge DOM.
// User-configurable via the config panel.
const DEFAULT_MAX_EAGER_PAGES = 50

const getMaxEagerPages = (): number => {
  const v = Number(
    getConfig(CONFIG_KEYS.MAX_EAGER_PAGES, DEFAULT_MAX_EAGER_PAGES)
  )
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_EAGER_PAGES
}

// How many page fetches run in parallel while eager-loading a thread.
const LOAD_CONCURRENCY = 4

const SENTINEL_MARGIN = "600px"

const pageUrl = (page: number): string => {
  const url = new URL(window.location.href)
  url.searchParams.set("page", String(page))
  url.searchParams.delete("goto")
  url.hash = ""
  return url.toString()
}

const parseCount = (raw: string): number => Number(raw.replace(/\./g, ""))

const getCurrentPage = (): number => {
  const raw = new URL(window.location.href).searchParams.get("page")
  const n = raw ? parseInt(raw, 10) : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

/**
 * Total number of pages in the thread. Primary source is the "Mostrando
 * resultados del A al B de TOTAL" indicator (new interface), from which the
 * per-page size — user-configurable, so not hardcoded — is derived. Falls back
 * to the highest `page=` link in the document (old interface / safety net).
 */
const getTotalPages = (
  doc: ParentNode,
  selectors: SelectorConfig,
  currentPage: number
): number => {
  if (selectors.resultsInfo) {
    const el = doc.querySelector(selectors.resultsInfo)
    const title = el?.getAttribute("title") ?? el?.textContent ?? ""
    const m = title.match(/del\s+([\d.]+)\s+al\s+([\d.]+)\s+de\s+([\d.]+)/i)
    if (m) {
      const first = parseCount(m[1])
      const last = parseCount(m[2])
      const total = parseCount(m[3])
      const perPage =
        currentPage > 1 ? (first - 1) / (currentPage - 1) : last - first + 1
      if (perPage > 0) return Math.max(1, Math.ceil(total / perPage))
    }
  }

  let max = currentPage
  for (const a of doc.querySelectorAll<HTMLAnchorElement>('a[href*="page="]')) {
    const n = parseInt(
      new URL(a.href, window.location.href).searchParams.get("page") ?? "",
      10
    )
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

const createSeparator = (page: number): HTMLElement => {
  const div = document.createElement("div")
  div.className = "infinite-scroll-separator"

  const line = document.createElement("div")
  line.className = "infinite-scroll-separator-line"

  const span = document.createElement("span")
  span.className = "infinite-scroll-separator-text"
  span.textContent = `Página ${page}`

  div.append(line, span)
  return div
}

class ThreadLoader {
  private loading = false
  private nextPage: number
  private prevPage: number

  constructor(
    private readonly feed: HTMLElement,
    private readonly selectors: SelectorConfig,
    private readonly currentPage: number,
    private readonly totalPages: number
  ) {
    this.nextPage = currentPage + 1
    this.prevPage = currentPage - 1
  }

  start() {
    const remaining = this.totalPages - 1 // every page except the current one
    if (remaining <= 0) return

    if (remaining <= getMaxEagerPages()) {
      // Small enough: pull the whole thread (both directions) up front.
      this.eagerLoadAll()
    } else {
      // Too many pages to bulk-load: fall back to lazy loading on scroll.
      if (this.nextPage <= this.totalPages) this.observe("after")
      if (this.prevPage >= 1) this.observe("before")
    }
  }

  /** Run `fn` only when no other load is in flight (single-flight mutex). */
  private async withLock(fn: () => Promise<void>): Promise<boolean> {
    if (this.loading) return false
    this.loading = true
    try {
      await fn()
      return true
    } finally {
      this.loading = false
    }
  }

  private async fetchPageNodes(page: number): Promise<Element[] | null> {
    try {
      const res = await fetch(pageUrl(page))
      const html = await res.text()
      const doc = new DOMParser().parseFromString(html, "text/html")
      const newFeed = doc.querySelector(this.selectors.feedContainer)
      return newFeed ? Array.from(newFeed.children) : null
    } catch (err) {
      logger.error(`Thread loader: failed to fetch page ${page}`, err)
      return null
    }
  }

  private appendPage(page: number, nodes: Element[]) {
    this.feed.append(createSeparator(page))
    for (const node of nodes) this.feed.append(document.importNode(node, true))
  }

  private prependPage(page: number, nodes: Element[]) {
    const root = document.documentElement
    const prevHeight = root.scrollHeight
    const prevTop = root.scrollTop

    const first = this.feed.firstChild
    for (const node of nodes) {
      this.feed.insertBefore(document.importNode(node, true), first)
    }
    this.feed.insertBefore(createSeparator(page), first)

    // Keep the viewport anchored while content is inserted above it.
    root.scrollTop = prevTop + (root.scrollHeight - prevHeight)
  }

  private async eagerLoadAll() {
    // Fetch order: interleave forward/backward so the nearest pages arrive first.
    const queue: number[] = []
    let f = this.currentPage + 1
    let b = this.currentPage - 1
    while (f <= this.totalPages || b >= 1) {
      if (f <= this.totalPages) queue.push(f++)
      if (b >= 1) queue.push(b--)
    }

    const status = new LoadStatus(queue.length)
    // Pages may finish out of order; buffer them and insert only contiguous runs
    // so each side stays in page order. Failed pages become [] to not block.
    const ready = new Map<number, Element[]>()
    let nextFwd = this.currentPage + 1
    let nextBwd = this.currentPage - 1

    const flush = () => {
      while (ready.has(nextFwd)) {
        const nodes = ready.get(nextFwd)!
        ready.delete(nextFwd)
        if (nodes.length) this.appendPage(nextFwd, nodes)
        nextFwd++
      }
      while (ready.has(nextBwd)) {
        const nodes = ready.get(nextBwd)!
        ready.delete(nextBwd)
        if (nodes.length) this.prependPage(nextBwd, nodes)
        nextBwd--
      }
    }

    let cursor = 0
    let done = 0
    const worker = async () => {
      while (cursor < queue.length) {
        const page = queue[cursor++]
        const nodes = await this.fetchPageNodes(page)
        ready.set(page, nodes ?? [])
        flush()
        status.update(++done)
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(LOAD_CONCURRENCY, queue.length) }, worker)
    )
    status.remove()
  }

  private observe(edge: "before" | "after") {
    const sentinel = document.createElement("div")
    sentinel.className = "fcx-sentinel"
    sentinel.textContent =
      edge === "after"
        ? "Cargando página siguiente…"
        : "Cargando página anterior…"

    if (edge === "after") this.feed.after(sentinel)
    else this.feed.before(sentinel)

    let intersecting = false

    // Load pages while the sentinel is in view. IntersectionObserver only fires
    // on intersection *changes*, so a sentinel that stays continuously visible
    // (e.g. it's already on screen when you land, or eager-loading held the lock
    // when it first fired) must be pumped manually until it scrolls out of view.
    const pump = async () => {
      if (!intersecting) return
      const done = await this.withLock(async () => {
        if (edge === "after") {
          const nodes = await this.fetchPageNodes(this.nextPage)
          if (nodes) this.appendPage(this.nextPage, nodes)
          this.nextPage++
        } else {
          const nodes = await this.fetchPageNodes(this.prevPage)
          if (nodes) this.prependPage(this.prevPage, nodes)
          this.prevPage--
        }
      })
      if (!done) {
        // Another load was in flight; retry so this sentinel isn't starved.
        setTimeout(pump, 100)
        return
      }

      const exhausted =
        edge === "after" ? this.nextPage > this.totalPages : this.prevPage < 1
      if (exhausted) {
        observer.disconnect()
        sentinel.remove()
        return
      }
      if (intersecting) pump()
    }

    const observer = new IntersectionObserver(
      entries => {
        intersecting = entries[0].isIntersecting
        if (intersecting) pump()
      },
      { rootMargin: SENTINEL_MARGIN }
    )
    observer.observe(sentinel)
  }
}

/** Floating progress pill shown while a thread is eagerly loaded. */
class LoadStatus {
  private readonly el: HTMLElement

  constructor(private readonly total: number) {
    this.el = document.createElement("div")
    this.el.className = "fcx-load-status"
    document.body.append(this.el)
  }

  update(done: number) {
    this.el.textContent = `Cargando hilo… ${done}/${this.total}`
  }

  remove() {
    this.el.remove()
  }
}

export const initThreadLoader = (selectors: SelectorConfig) => {
  if (currentPageType !== PageType.THREAD) {
    logger.log("Thread loader: not a thread page.")
    return
  }

  const feed = document.querySelector<HTMLElement>(selectors.feedContainer)
  if (!feed) {
    logger.warn("Thread loader: feed container not found.")
    return
  }

  const currentPage = getCurrentPage()
  const totalPages = getTotalPages(document, selectors, currentPage)
  logger.log(`Thread loader: page ${currentPage} of ${totalPages}`)

  new ThreadLoader(feed, selectors, currentPage, totalPages).start()
}
