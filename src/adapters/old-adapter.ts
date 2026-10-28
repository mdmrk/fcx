import { oldSelectors } from "@/config"
import { initNavButtons } from "@/lib/nav-buttons"
import { removeBanners } from "@/lib/remove-banners"
import { setupThreadFeatures } from "@/lib/thread-features"
import type { SiteAdapter } from "@/types/adapter"
import { logger } from "@/utils/logger"

export class OldSiteAdapter implements SiteAdapter {
  name = "Old Interface"
  selectors = oldSelectors

  init() {
    logger.log(`Initializing ${this.name} adapter...`)
    removeBanners("old")
    initNavButtons()
  }

  setupFeatures() {
    setupThreadFeatures(this.selectors, "old")
  }
}
