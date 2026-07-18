import { oldSelectors } from "@/config"
import { CONFIG_KEYS } from "@/config-registry"
import { removeBanners } from "@/lib/remove-banners"
import { initThreadLoader } from "@/lib/thread-loader"
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
  }

  setupFeatures() {
    if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, "old")) {
      initThreadLoader(this.selectors)
    }
  }
}
