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
