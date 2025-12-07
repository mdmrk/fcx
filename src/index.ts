import STYLES from "@/style.css"
import { injectConsole } from "@/utils/inject-console"

	; (() => {
		injectConsole("FCX")
		GM_addStyle(STYLES)

		console.log("Ready for scripting")

		const aborts: Array<() => void> = []

		return () => {
			console.log("Not Ready for scripting")
			aborts.forEach(abort => abort?.())
			aborts.length = 0
		}
	})()
