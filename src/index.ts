import STYLES from "@/style.css"
import { injectConsole } from "@/utils/inject-console"

import { logger } from "@/utils/logger"
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
  logger.log("Script initializing...")
  logger.log(`Interface: ${isNew ? "New" : "Old"}`)
  logger.log(`Page Type: ${currentPageType}`)

  const adapter: SiteAdapter = isNew
    ? new NewSiteAdapter()
    : new OldSiteAdapter()
  adapter.init()
  adapter.setupFeatures()

  GM_registerMenuCommand("Configuración", toggleConfigPanel)

  return () => {
    logger.log("Script unloaded")
  }
})()
