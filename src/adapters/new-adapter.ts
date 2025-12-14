import type { SiteAdapter, SelectorConfig } from "@/types/adapter"
import { watchFeed } from "@/lib/watch-feed"
import { initInfiniteScroll } from "@/lib/infinite-scroll"
import { devMode, newSelectors } from "@/config"
import { getConfig } from "@/utils/storage"
import { CONFIG_KEYS } from "@/config-registry"

export class NewSiteAdapter implements SiteAdapter {
	name = "New Interface"
	selectors: SelectorConfig

	constructor() {
		this.selectors = newSelectors
	}

	init() {
		if (devMode) console.log(`Initializing ${this.name} adapter...`)
		this.removeSidebar()
	}

	private removeSidebar() {
		const shouldRemove = getConfig(CONFIG_KEYS.REMOVE_SIDEBAR, true)
		if (!shouldRemove) return

		const sidebar = document.querySelector("#sidebar")
		if (sidebar) sidebar.remove()

		const main = document.querySelector("main")
		if (main) main.style.display = "block"
	}

	setupFeatures() {
		watchFeed(this.selectors)
		if (getConfig(CONFIG_KEYS.INFINITE_SCROLL, true)) {
			initInfiniteScroll(this.selectors)
		}
	}
}
