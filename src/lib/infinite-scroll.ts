import { devMode } from "@/config"
import type { SelectorConfig } from "@/types/adapter"
import { currentPageType } from "@/utils/page-state"
import { PageType } from "@/types/page-state"

let isLoading = false
let nextUrl: string | null = null
let currentSelectors: SelectorConfig | null = null

export const initInfiniteScroll = (selectors: SelectorConfig) => {
  currentSelectors = selectors

  if (currentPageType !== PageType.THREAD) {
    if (devMode) console.log("Infinite Scroll: Not a thread page.")
    return
  }

  const nextLink = document.querySelector<HTMLAnchorElement>(
    selectors.nextPageLink
  )

  if (!nextLink) {
    if (devMode) console.log("Infinite Scroll: No next page found.")
    return
  }

  nextUrl = nextLink.href
  if (devMode) console.log("Infinite Scroll: Next page is", nextUrl)

  const sentry = document.createElement("div")
  sentry.id = "infinite-scroll-sentry"
  sentry.innerHTML =
    "<p style='color: #666; font-weight: bold;'>Loading next page...</p>"
  sentry.style.textAlign = "center"
  sentry.style.padding = "40px"

  const feed = document.querySelector(selectors.feedContainer)
  if (feed) feed.after(sentry)

  const observer = new IntersectionObserver(
    entries => {
      const entry = entries[0]
      if (entry.isIntersecting && !isLoading && nextUrl) {
        loadNextPage()
      }
    },
    { rootMargin: "300px" }
  )

  observer.observe(sentry)
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
      document.querySelector("#infinite-scroll-sentry")?.remove()
    }
  } catch (err) {
    console.error("Infinite Scroll Error:", err)
  } finally {
    isLoading = false
  }
}
