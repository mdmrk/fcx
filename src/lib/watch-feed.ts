import { devMode } from "@/config"
import { styleComment } from "@/lib/style-comment"
import type { SelectorConfig } from "@/types/adapter"

/**
 * Watches the forum feed for new comments and applies styling.
 * @returns Cleanup function to stop watching
 */
export const watchFeed = (selectors: SelectorConfig): (() => void) => {
  if (!window.location.href.includes("showthread.php")) {
    if (devMode) console.log("Not a thread page, skipping feed watcher.")
    return () => {}
  }

  const feed = document.querySelector<HTMLElement>(selectors.feedContainer)

  if (!feed) {
    if (devMode) console.warn("Feed container not found, retrying in 1s...")
    const timer = setTimeout(() => watchFeed(selectors), 1000)
    return () => clearTimeout(timer)
  }

  if (devMode) console.log("Feed found, starting watcher...")

  const existing = feed.querySelectorAll<HTMLElement>(selectors.commentItem)
  existing.forEach(el => {
    styleComment(el, selectors)
  })

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.matches(selectors.commentItem)) {
            styleComment(node, selectors)
          } else {
            const children = node.querySelectorAll<HTMLElement>(
              selectors.commentItem
            )
            children.forEach(el => {
              styleComment(el, selectors)
            })
          }
        }
      }
    }
  })

  observer.observe(feed, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    if (devMode) console.log("Feed watcher stopped")
  }
}
