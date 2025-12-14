import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { oldSelectors } from "@/config"
import { watchFeed } from "@/lib/watch-feed"
import { initInfiniteScroll } from "@/lib/infinite-scroll"
import { devMode } from "@/config"

export class OldSiteAdapter implements SiteAdapter {
	name = "Old Interface"
	selectors: SelectorConfig

	constructor() {
		this.selectors = oldSelectors
	}

	init() {
		if (devMode) console.log(`Initializing ${this.name} adapter...`)
	}

	setupFeatures() {
		watchFeed(this.selectors)
		initInfiniteScroll(this.selectors)
	}
}
