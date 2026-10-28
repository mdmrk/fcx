import { newSelectors } from "@/config"
import { CONFIG_KEYS } from "@/config-registry"
import { initMedia } from "@/lib/media"
import { initNavButtons } from "@/lib/nav-buttons"
import { initQuotes } from "@/lib/quotes"
import { removeBanners } from "@/lib/remove-banners"
import { setupThreadFeatures } from "@/lib/thread-features"
import type { SiteAdapter } from "@/types/adapter"
import { logger } from "@/utils/logger"
import { isThreadPage } from "@/utils/page-state"
import { getEffectiveConfig } from "@/utils/storage"

export class NewSiteAdapter implements SiteAdapter {
  name = "New Interface"
  selectors = newSelectors

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
    if (!isThreadPage && !getEffectiveConfig(CONFIG_KEYS.REMOVE_SIDEBAR, "new"))
      return
    document.getElementById("sidebar")?.remove()
    const main = document.querySelector("main")
    if (main) main.style.display = "block"
  }

  setupFeatures() {
    setupThreadFeatures(this.selectors, "new")
  }
}
