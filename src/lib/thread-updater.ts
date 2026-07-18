import { getCurrentPage, getTotalPages, pageUrl } from "@/lib/thread-loader"
import type { SelectorConfig } from "@/types/adapter"
import { logger } from "@/utils/logger"
import { isThreadPage } from "@/utils/page-state"

const BASE_INTERVAL = 30_000
const MAX_INTERVAL = 300_000
const BACKOFF = 1.5

const postIdIn = (node: Element): string | null => {
  if (/^post\d+$/.test(node.id)) return node.id
  for (const el of node.querySelectorAll<HTMLElement>('[id^="post"]')) {
    if (/^post\d+$/.test(el.id)) return el.id
  }
  return null
}

class ThreadUpdater {
  private interval = BASE_INTERVAL
  private timer = 0
  private nextCheck = 0
  private checking = false
  private unread = 0
  private readonly baseTitle = document.title
  private readonly pill = document.createElement("div")

  constructor(
    private readonly feed: HTMLElement,
    private readonly selectors: SelectorConfig,
    private page: number
  ) {}

  start() {
    this.pill.className = "fcx-load-status fcx-updater"
    this.pill.title = "Buscar posts nuevos ahora"
    this.pill.onclick = () => this.check(true)
    document.body.append(this.pill)
    window.setInterval(() => this.renderCountdown(), 1000)

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return
      this.unread = 0
      document.title = this.baseTitle
    })

    this.schedule()
  }

  private schedule() {
    this.nextCheck = Date.now() + this.interval
    this.timer = window.setTimeout(() => this.check(), this.interval)
    this.renderCountdown()
  }

  private renderCountdown() {
    if (this.checking) return
    const s = Math.max(0, Math.ceil((this.nextCheck - Date.now()) / 1000))
    this.pill.textContent = `↻ ${s}s`
  }

  private async check(manual = false) {
    if (this.checking) return
    this.checking = true
    window.clearTimeout(this.timer)
    this.pill.textContent = "↻ …"

    let added = 0
    try {
      for (;;) {
        const res = await fetch(pageUrl(this.page))
        const doc = new DOMParser().parseFromString(
          await res.text(),
          "text/html"
        )
        const remoteFeed = doc.querySelector(this.selectors.feedContainer)
        if (!remoteFeed) break

        for (const node of remoteFeed.children) {
          const id = postIdIn(node)
          if (!id || document.getElementById(id)) continue
          this.feed.append(document.importNode(node, true))
          added++
        }

        if (getTotalPages(doc, this.selectors, this.page) <= this.page) break
        this.page++
      }
    } catch (err) {
      logger.error("Thread updater: check failed", err)
    }

    if (added > 0) {
      logger.log(`Thread updater: ${added} new post(s)`)
      this.interval = BASE_INTERVAL
      if (document.hidden) {
        this.unread += added
        document.title = `(${this.unread}) ${this.baseTitle}`
      }
    } else if (!manual) {
      this.interval = Math.min(this.interval * BACKOFF, MAX_INTERVAL)
    }

    this.checking = false
    this.schedule()
  }
}

export const initThreadUpdater = (
  selectors: SelectorConfig,
  fromPage?: number
) => {
  if (!isThreadPage) return
  const feed = document.querySelector<HTMLElement>(selectors.feedContainer)
  if (!feed) return

  let page = fromPage
  if (page === undefined) {
    const current = getCurrentPage()
    if (getTotalPages(document, selectors, current) > current) {
      logger.log("Thread updater: not on the last page.")
      return
    }
    page = current
  }

  logger.log(`Thread updater: polling from page ${page}`)
  new ThreadUpdater(feed, selectors, page).start()
}
