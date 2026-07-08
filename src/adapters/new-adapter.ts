import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { initThreadLoader } from "@/lib/thread-loader"
import { initMedia } from "@/lib/media"
import { initQuotes } from "@/lib/quotes"
import { newSelectors } from "@/config"
import { logger } from "@/utils/logger"
import { getEffectiveConfig } from "@/utils/storage"
import { CONFIG_KEYS } from "@/config-registry"
import { removeBanners } from "@/lib/remove-banners"
import { currentPageType } from "@/utils/page-state"
import { PageType } from "@/types/page-state"

export class NewSiteAdapter implements SiteAdapter {
  name = "New Interface"
  selectors: SelectorConfig

  constructor() {
    this.selectors = newSelectors
  }

  init() {
    logger.log(`Initializing ${this.name} adapter...`)
    this.removeSidebar()
    this.applyCompact()
    removeBanners("new")
  }

  private applyCompact() {
    if (!getEffectiveConfig(CONFIG_KEYS.COMPACT_THREADS, "new")) return
    document.documentElement.classList.add("fcx-compact")
    initMedia()
    initQuotes()
  }

  private removeSidebar() {
    // Threads always drop the sidebar, ignoring the toggle.
    const isThread = currentPageType === PageType.THREAD
    if (!isThread && !getEffectiveConfig(CONFIG_KEYS.REMOVE_SIDEBAR, "new"))
      return

    const sidebar = document.querySelector("#sidebar")
    if (sidebar) sidebar.remove()

    const main = document.querySelector<HTMLElement>("main")
    if (main) main.style.display = "block"
  }

  setupFeatures() {
    if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, "new")) {
      initThreadLoader(this.selectors)
    }
  }
}
