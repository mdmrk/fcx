import { newSelectors } from "@/config"
import { CONFIG_KEYS } from "@/config-registry"
import { initMedia } from "@/lib/media"
import { initNavButtons } from "@/lib/nav-buttons"
import { initQuotes } from "@/lib/quotes"
import { removeBanners } from "@/lib/remove-banners"
import { initThreadLoader } from "@/lib/thread-loader"
import { initThreadUpdater } from "@/lib/thread-updater"
import type { SelectorConfig, SiteAdapter } from "@/types/adapter"
import { logger } from "@/utils/logger"
import { isThreadPage } from "@/utils/page-state"
import { getEffectiveConfig } from "@/utils/storage"

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
    initNavButtons()
  }

  private applyCompact() {
    if (!getEffectiveConfig(CONFIG_KEYS.COMPACT_THREADS, "new")) return
    document.documentElement.classList.add("fcx-compact")
    initMedia()
    initQuotes()
  }

  private removeSidebar() {
    // Threads always drop the sidebar, ignoring the toggle.
    if (!isThreadPage && !getEffectiveConfig(CONFIG_KEYS.REMOVE_SIDEBAR, "new"))
      return

    const sidebar = document.querySelector("#sidebar")
    if (sidebar) sidebar.remove()

    const main = document.querySelector<HTMLElement>("main")
    if (main) main.style.display = "block"
  }

  setupFeatures() {
    const autoUpdate = getEffectiveConfig(CONFIG_KEYS.AUTO_UPDATE, "new")
    if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, "new")) {
      initThreadLoader(
        this.selectors,
        autoUpdate ? page => initThreadUpdater(this.selectors, page) : undefined
      )
    } else if (autoUpdate) {
      initThreadUpdater(this.selectors)
    }
  }
}
