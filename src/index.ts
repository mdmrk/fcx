import STYLES from "@/style.css"
import { injectConsole } from "@/utils/inject-console"
import { watchFeed } from "@/lib/watch-feed"
import { initInfiniteScroll } from "@/lib/infinite-scroll"
import { devMode } from "@/config"

;(() => {
	injectConsole("FCX")
	GM_addStyle(STYLES)

	if (devMode) console.log("Script initializing...")

	const cleanupWatcher = watchFeed()
	initInfiniteScroll()

	return () => {
		cleanupWatcher()
		if (devMode) console.log("Script unloaded")
	}
})()
