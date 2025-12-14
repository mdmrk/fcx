import STYLES from "@/style.css"
import { injectConsole } from "@/utils/inject-console"

import { devMode } from "@/config"
import { isNewInterface } from "@/utils/detect-interface"
import { currentPageType } from "@/utils/page-state"
import { toggleConfigPanel } from "@/ui/config-panel"
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

	// Settings Button
	const settingsBtn = document.createElement("button")
	settingsBtn.textContent = "⚙️"
	Object.assign(settingsBtn.style, {
		position: "fixed",
		bottom: "20px",
		right: "20px",
		zIndex: "9997",
		padding: "8px 12px",
		borderRadius: "50%",
		backgroundColor: "#1e1e1e",
		color: "#fff",
		border: "1px solid #444",
		cursor: "pointer",
		fontSize: "20px",
		boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
	})
	settingsBtn.onclick = toggleConfigPanel
	document.body.appendChild(settingsBtn)

	return () => {
		if (devMode) console.log("Script unloaded")
		settingsBtn.remove()
	}
})()
