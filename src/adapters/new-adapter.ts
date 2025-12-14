import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { watchFeed } from "@/lib/watch-feed"
import { initInfiniteScroll } from "@/lib/infinite-scroll"
import { devMode, newSelectors } from "@/config"

export class NewSiteAdapter implements SiteAdapter {
	name = "New Interface"
	selectors: SelectorConfig

	constructor() {
		this.selectors = newSelectors
	}

	init() {
		if (devMode) console.log(`Initializing ${this.name} adapter...`)
	}

	setupFeatures() {
		watchFeed(this.selectors)
		initInfiniteScroll(this.selectors)
	}
}
