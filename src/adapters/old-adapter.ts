import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { oldSelectors } from "@/config"
import { watchFeed } from "@/lib/watch-feed"
import { initInfiniteScroll } from "@/lib/infinite-scroll"
import { logger } from "@/utils/logger"
import { removeBanners } from "@/lib/remove-banners"
import { CONFIG_KEYS } from "@/config-registry"
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
    watchFeed(this.selectors)
    if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, "old")) {
      initInfiniteScroll(this.selectors)
    }
  }
}
