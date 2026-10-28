import { CONFIG_KEYS } from "@/config-registry"
import { initThreadLoader } from "@/lib/thread-loader"
import { initThreadUpdater } from "@/lib/thread-updater"
import type { SelectorConfig } from "@/types/adapter"
import type { Scope } from "@/types/config"
import { getEffectiveConfig } from "@/utils/storage"

export const setupThreadFeatures = (
  selectors: SelectorConfig,
  scope: Scope
) => {
  const autoUpdate = getEffectiveConfig(CONFIG_KEYS.AUTO_UPDATE, scope)
  if (getEffectiveConfig(CONFIG_KEYS.INFINITE_SCROLL, scope)) {
    initThreadLoader(
      selectors,
      autoUpdate ? page => initThreadUpdater(selectors, page) : undefined
    )
  } else if (autoUpdate) {
    initThreadUpdater(selectors)
  }
}
