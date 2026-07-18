import { NewSiteAdapter } from "@/adapters/new-adapter"
import { OldSiteAdapter } from "@/adapters/old-adapter"
import STYLES from "@/style.css"
import type { SiteAdapter } from "@/types/adapter"
import { toggleConfigPanel } from "@/ui/config-panel"
import { isNewInterface } from "@/utils/detect-interface"
import { logger } from "@/utils/logger"
;(() => {
  GM_addStyle(STYLES)

  const isNew = isNewInterface()
  logger.log("Script initializing...")
  logger.log(`Interface: ${isNew ? "New" : "Old"}`)

  const adapter: SiteAdapter = isNew
    ? new NewSiteAdapter()
    : new OldSiteAdapter()
  adapter.init()
  adapter.setupFeatures()

  GM_registerMenuCommand("Configuración", toggleConfigPanel)
})()
