import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { initThreadLoader } from "@/lib/thread-loader"
import { newSelectors } from "@/config"
import { logger } from "@/utils/logger"
import { getEffectiveConfig } from "@/utils/storage"
import { CONFIG_KEYS } from "@/config-registry"
import { removeBanners } from "@/lib/remove-banners"

export class NewSiteAdapter implements SiteAdapter {
  name = "New Interface"
  selectors: SelectorConfig

  constructor() {
    this.selectors = newSelectors
  }

  init() {
    logger.log(`Initializing ${this.name} adapter...`)
    this.removeSidebar()
    removeBanners("new")
  }

  private removeSidebar() {
    const shouldRemove = getEffectiveConfig(CONFIG_KEYS.REMOVE_SIDEBAR, "new")
    if (!shouldRemove) return

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
