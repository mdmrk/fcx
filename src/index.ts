import { bodyId, devMode } from "@/config"
import STYLES from "@/style.css"
;(() => {
	// Make sure this is the React-Mobile version of facebook
	if (document.body.id !== bodyId) {
		console.error("ID 'app-body' not found.")
		return
	}

	GM_addStyle(STYLES)

	console.log("Ready for scripting")

	// Store all abort functions
	const aborts: Array<() => void> = []

	return () => {
		console.log("Not Ready for scripting")
		// Cleanup code like removing dom nodes and destroying event listeners
		aborts.forEach(abort => abort?.())
		aborts.length = 0
	}
})()
