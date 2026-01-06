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
  // General setting (acting as override)
  const general = getConfig(key, false as boolean)
  if (general === true) return true

  // Specific scope setting
  const scopedKey = getScopedConfigKey(key, scope)
  // Default to true if not set, or false?
  // Logic: "General" overrides everything if TRUE.
  // If General is FALSE, we check the specific setting.
  // Wait, the requirement is "General overrides the other two".
  // If General is checked, enabled for all.
  // If General is unchecked, check specific.

  // NOTE: defaultValue management is tricky here.
  // We assume boolean for all these scoped configs for now.
  return getConfig(scopedKey, false)
}
