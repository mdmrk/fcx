import { CONFIG_KEYS } from "@/config-registry"
import { getEffectiveConfig } from "@/utils/storage"

export const removeBanners = (scope: "new" | "old") => {
  const shouldRemove = getEffectiveConfig(CONFIG_KEYS.REMOVE_BANNERS, scope)
  if (!shouldRemove) return
  const banner = document.getElementById("notices-wrapper")
  if (banner) {
    banner.remove()
  }
}
