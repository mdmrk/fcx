import { PageType } from "@/types/page-state"

export const detectPageType = (): PageType => {
  const url = window.location.href

  if (url.includes("showthread.php")) {
    return PageType.THREAD
  }

  if (url.includes("forumdisplay.php")) {
    return PageType.CATEGORY
  }

  if (/\/foro\/?($|\?|#)/.test(url)) {
    return PageType.HOME
  }

  if (/^https?:\/\/[^/]+\/?(?:$|\?|#)/.test(url)) {
    return PageType.HOME
  }

  return PageType.UNKNOWN
}

export const currentPageType = detectPageType()
