import { getConfig } from "@/utils/storage"
import { CONFIG_KEYS } from "@/config-registry"

export const removeBanners = () => {
  const shouldRemove = getConfig(CONFIG_KEYS.REMOVE_BANNERS, true)
  if (!shouldRemove) return
  const banner = document.getElementById("notices-wrapper")
  if (banner) {
    banner.remove()
  }
}
