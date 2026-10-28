import { CONFIG_KEYS } from "@/config-registry"
import type { Scope } from "@/types/config"
import { getEffectiveConfig } from "@/utils/storage"

export const removeBanners = (scope: Scope) => {
  if (!getEffectiveConfig(CONFIG_KEYS.REMOVE_BANNERS, scope)) return
  document.getElementById("notices-wrapper")?.remove()
  for (const promo of document.querySelectorAll(".fc-custom-promo"))
    promo.remove()
}
