import { CONFIG_KEYS } from "@/config-registry"
import type { SelectorConfig } from "@/types/adapter"
import { logger } from "@/utils/logger"
import { isThreadPage } from "@/utils/page-state"
import { getConfig } from "@/utils/storage"

const DEFAULT_MAX_EAGER_PAGES = 50

const getMaxEagerPages = (): number => {
  const v = Number(
    getConfig(CONFIG_KEYS.MAX_EAGER_PAGES, DEFAULT_MAX_EAGER_PAGES)
  )
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_EAGER_PAGES
}

const LOAD_CONCURRENCY = 4

const SENTINEL_MARGIN = "600px"

const threadId = (): string | null => {
  const fromUrl = new URL(window.location.href).searchParams.get("t")
  if (fromUrl) return fromUrl
  const input = document.querySelector<HTMLInputElement>('input[name="t"]')
  if (input?.value) return input.value
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href*="showthread.php?t="][href*="page="]'
  )
  return link ? new URL(link.href).searchParams.get("t") : null
}

export const pageUrl = (page: number): string => {
  const id = threadId()
  const url = id
    ? new URL(`showthread.php?t=${id}`, window.location.href)
    : new URL(window.location.href)
  url.searchParams.set("page", String(page))
  url.searchParams.delete("goto")
  url.searchParams.delete("p")
  url.hash = ""
  return url.toString()
}

const parseCount = (raw: string): number => Number(raw.replace(/\./g, ""))

const positivePage = (raw: string | null | undefined): number | null => {
  const n = parseInt(raw ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const getCurrentPage = (selectors: SelectorConfig): number =>
  positivePage(
    selectors.resultsInfo &&
      document.querySelector(selectors.resultsInfo)?.textContent
  ) ??
  positivePage(new URL(window.location.href).searchParams.get("page")) ??
  1

export const getTotalPages = (
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
    const n = positivePage(new URL(a.href).searchParams.get("page"))
    if (n && n > max) max = n
  }
  return max
}

class ThreadLoader {
  private loading = false
  private nextPage: number
  private prevPage: number

  constructor(
    private readonly feed: HTMLElement,
    private readonly selectors: SelectorConfig,
    private readonly currentPage: number,
    private readonly totalPages: number,
    private readonly onEndReached?: (lastPage: number) => void
  ) {
    this.nextPage = currentPage + 1
    this.prevPage = currentPage - 1
  }

  start() {
    const remaining = this.totalPages - 1
    if (remaining <= 0) {
      this.onEndReached?.(this.totalPages)
      return
    }

    if (remaining <= getMaxEagerPages()) {
      this.eagerLoadAll().then(() => this.onEndReached?.(this.totalPages))
    } else {
      if (this.nextPage <= this.totalPages) this.observe("after")
      else this.onEndReached?.(this.totalPages)
      if (this.prevPage >= 1) this.observe("before")
    }
  }

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

  private appendPage(nodes: Element[]) {
    for (const node of nodes) this.feed.append(document.importNode(node, true))
  }

  private prependPage(nodes: Element[]) {
    const root = document.documentElement
    const prevHeight = root.scrollHeight
    const prevTop = root.scrollTop

    const first = this.feed.firstChild
    for (const node of nodes) {
      this.feed.insertBefore(document.importNode(node, true), first)
    }

    root.scrollTop = prevTop + (root.scrollHeight - prevHeight)
  }

  private async eagerLoadAll() {
    const queue: number[] = []
    let f = this.currentPage + 1
    let b = this.currentPage - 1
    while (f <= this.totalPages || b >= 1) {
      if (f <= this.totalPages) queue.push(f++)
      if (b >= 1) queue.push(b--)
    }

    const status = new LoadStatus(queue.length)
    const ready = new Map<number, Element[]>()
    let nextFwd = this.currentPage + 1
    let nextBwd = this.currentPage - 1

    const flush = () => {
      while (ready.has(nextFwd)) {
        const nodes = ready.get(nextFwd)!
        ready.delete(nextFwd)
        if (nodes.length) this.appendPage(nodes)
        nextFwd++
      }
      while (ready.has(nextBwd)) {
        const nodes = ready.get(nextBwd)!
        ready.delete(nextBwd)
        if (nodes.length) this.prependPage(nodes)
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

    const pump = async () => {
      if (!intersecting) return
      const done = await this.withLock(async () => {
        if (edge === "after") {
          const nodes = await this.fetchPageNodes(this.nextPage)
          if (nodes) this.appendPage(nodes)
          this.nextPage++
        } else {
          const nodes = await this.fetchPageNodes(this.prevPage)
          if (nodes) this.prependPage(nodes)
          this.prevPage--
        }
      })
      if (!done) {
        setTimeout(pump, 100)
        return
      }

      const exhausted =
        edge === "after" ? this.nextPage > this.totalPages : this.prevPage < 1
      if (exhausted) {
        observer.disconnect()
        sentinel.remove()
        if (edge === "after") this.onEndReached?.(this.totalPages)
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

export const initThreadLoader = (
  selectors: SelectorConfig,
  onEndReached?: (lastPage: number) => void
) => {
  if (!isThreadPage) {
    logger.log("Thread loader: not a thread page.")
    return
  }

  const feed = document.querySelector<HTMLElement>(selectors.feedContainer)
  if (!feed) {
    logger.warn("Thread loader: feed container not found.")
    return
  }

  const currentPage = getCurrentPage(selectors)
  const totalPages = getTotalPages(document, selectors, currentPage)
  logger.log(`Thread loader: page ${currentPage} of ${totalPages}`)

  new ThreadLoader(
    feed,
    selectors,
    currentPage,
    totalPages,
    onEndReached
  ).start()
}
