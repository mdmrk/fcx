import { oldSelectors } from "@/config"
import { CONFIG_KEYS } from "@/config-registry"
import { initNavButtons } from "@/lib/nav-buttons"
import { removeBanners } from "@/lib/remove-banners"
import { initThreadLoader } from "@/lib/thread-loader"
import { initThreadUpdater } from "@/lib/thread-updater"
import type { SelectorConfig, SiteAdapter } from "@/types/adapter"
import { logger } from "@/utils/logger"
import { getEffectiveConfig } from "@/utils/storage"

export class OldSiteAdapter implements SiteAdapter {
  name = "Old Interface"
  selectors: SelectorConfig

  constructor() {
    this.selectors = oldSelectors
  }

  init() {
    logger.log(`Initializing ${this.name} adapter...`)
    removeBanners("old")
    initNavButtons()
  }

  setupFeatures() {
    const autoUpdate = getEffectiveConfig(CONFIG_KEYS.AUTO_UPDATE, "old")
    if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, "old")) {
      initThreadLoader(
        this.selectors,
        autoUpdate ? page => initThreadUpdater(this.selectors, page) : undefined
      )
    } else if (autoUpdate) {
      initThreadUpdater(this.selectors)
    }
  }
}
