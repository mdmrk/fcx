import { configs } from "@/config-registry"
import type { ConfigValue } from "@/types/config"

export const getConfig = <T>(key: string, defaultValue: T): T => {
  if (typeof GM_getValue !== "undefined") {
    return GM_getValue(key, defaultValue as ConfigValue) as T
  }
  const val = localStorage.getItem(`fcx_${key}`)
  if (val === null) return defaultValue
  try {
    return JSON.parse(val)
  } catch {
    return val as unknown as T
  }
}

export const setConfig = <T>(key: string, value: T): void => {
  if (typeof GM_setValue !== "undefined") {
    GM_setValue(key, value as ConfigValue)
    return
  }
  localStorage.setItem(`fcx_${key}`, JSON.stringify(value))
}

export const resetConfig = (key: string, defaultValue: ConfigValue): void => {
  setConfig(key, defaultValue)
}

export const getScopedConfigKey = (
  key: string,
  scope: "new" | "old"
): string => {
  return `${key}_${scope}`
}

export const getEffectiveConfig = (
  key: string,
  scope: "new" | "old"
): boolean => {
  const fallback =
    (configs.find(c => c.key === key)?.defaultValue as boolean) ?? false

  // The "General" toggle overrides both interfaces when enabled; it defaults to
  // the registry's defaultValue so features are on/off out of the box as declared.
  if (getConfig(key, fallback)) return true

  // Otherwise defer to the per-interface toggle.
  return getConfig(getScopedConfigKey(key, scope), false)
}
