import { logger } from "@/utils/logger"
import type { SelectorConfig } from "@/types/adapter"
import { currentPageType } from "@/utils/page-state"
import { PageType } from "@/types/page-state"

let isLoading = false
let nextUrl: string | null = null
let prevUrl: string | null = null
let currentSelectors: SelectorConfig | null = null

export const initInfiniteScroll = (selectors: SelectorConfig) => {
  currentSelectors = selectors

  if (currentPageType !== PageType.THREAD) {
    logger.log("Infinite Scroll: Not a thread page.")
    return
  }

  const prevLink = document.querySelector<HTMLAnchorElement>(
    selectors.prevPageLink
  )

  if (prevLink) {
    prevUrl = prevLink.href
    logger.log("Infinite Scroll: Prev page is", prevUrl)

    const topSentry = document.createElement("div")
    topSentry.id = "infinite-scroll-top-sentry"
    topSentry.innerHTML =
      "<p style='color: #666; font-weight: bold;'>Cargando página anterior...</p>"
    topSentry.style.textAlign = "center"
    topSentry.style.padding = "40px"

    const feed = document.querySelector(selectors.feedContainer)
    if (feed) feed.before(topSentry)

    const topObserver = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting && !isLoading && prevUrl) {
          loadPrevPage()
        }
      },
      { rootMargin: "300px" }
    )

    topObserver.observe(topSentry)
  }

  const nextLink = document.querySelector<HTMLAnchorElement>(
    selectors.nextPageLink
  )

  if (!nextLink) {
    logger.log("Infinite Scroll: No next page found.")
  } else {
    nextUrl = nextLink.href
    logger.log("Infinite Scroll: Next page is", nextUrl)

    const bottomSentry = document.createElement("div")
    bottomSentry.id = "infinite-scroll-bottom-sentry"
    bottomSentry.innerHTML =
      "<p style='color: #666; font-weight: bold;'>Cargando página siguiente...</p>"
    bottomSentry.style.textAlign = "center"
    bottomSentry.style.padding = "40px"

    const feed = document.querySelector(selectors.feedContainer)
    if (feed) feed.after(bottomSentry)

    const bottomObserver = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting && !isLoading && nextUrl) {
          loadNextPage()
        }
      },
      { rootMargin: "300px" }
    )

    bottomObserver.observe(bottomSentry)
  }
}

const loadPrevPage = async () => {
  if (!prevUrl) return
  isLoading = true

  try {
    const response = await fetch(prevUrl)
    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, "text/html")
    const newFeed = doc.querySelector(currentSelectors!.feedContainer)
    const currentFeed = document.querySelector(currentSelectors!.feedContainer)

    if (newFeed && currentFeed) {
      const oldScrollHeight = document.documentElement.scrollHeight
      const oldScrollTop = document.documentElement.scrollTop

      Array.from(newFeed.children)
        .reverse()
        .forEach(child => {
          const importedNode = document.importNode(child, true)
          currentFeed.insertBefore(importedNode, currentFeed.firstChild)
        })

      const newScrollHeight = document.documentElement.scrollHeight
      document.documentElement.scrollTop =
        oldScrollTop + (newScrollHeight - oldScrollHeight)
    }

    const prevLink = doc.querySelector<HTMLAnchorElement>(
      currentSelectors!.prevPageLink
    )
    if (prevLink) {
      prevUrl = prevLink.href
    } else {
      prevUrl = null
      document.querySelector("#infinite-scroll-top-sentry")?.remove()
    }
  } catch (err) {
    console.error("Infinite Scroll (Prev) Error:", err)
  } finally {
    isLoading = false
  }
}

const loadNextPage = async () => {
  if (!nextUrl) return
  isLoading = true

  try {
    const response = await fetch(nextUrl)
    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, "text/html")
    const newFeed = doc.querySelector(currentSelectors!.feedContainer)
    const currentFeed = document.querySelector(currentSelectors!.feedContainer)

    if (newFeed && currentFeed) {
      // const divider = document.createElement("div")
      // divider.innerHTML = `<span style="background:#eee; padding: 5px 10px; border-radius: 4px;"> ${nextUrl}</span>`
      // divider.style.textAlign = "center"
      // divider.style.margin = "20px 0"
      // currentFeed.appendChild(divider)

      Array.from(newFeed.children).forEach(child => {
        const importedNode = document.importNode(child, true)
        currentFeed.appendChild(importedNode)
      })
    }

    const nextLink = doc.querySelector<HTMLAnchorElement>(
      currentSelectors!.nextPageLink
    )
    if (nextLink) {
      nextUrl = nextLink.href
    } else {
      nextUrl = null
      document.querySelector("#infinite-scroll-bottom-sentry")?.remove()
    }
  } catch (err) {
    console.error("Infinite Scroll Error:", err)
  } finally {
    isLoading = false
  }
}
