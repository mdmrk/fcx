import STYLES from "@/style.css"
import { injectConsole } from "@/utils/inject-console"

import { devMode } from "@/config"
import { isNewInterface } from "@/utils/detect-interface"
import { currentPageType } from "@/utils/page-state"
import { NewSiteAdapter } from "@/adapters/new-adapter"
import { OldSiteAdapter } from "@/adapters/old-adapter"
import type { SiteAdapter } from "@/types/adapter"

;(() => {
	injectConsole("FCX")
	GM_addStyle(STYLES)

	const isNew = isNewInterface()
	if (devMode) {
		console.log("Script initializing...")
		console.log(`Interface: ${isNew ? "New" : "Old"}`)
		console.log(`Page Type: ${currentPageType}`)
	}

	const adapter: SiteAdapter = isNew
		? new NewSiteAdapter()
		: new OldSiteAdapter()
	adapter.init()
	adapter.setupFeatures()

	return () => {
		if (devMode) console.log("Script unloaded")
	}
})()
