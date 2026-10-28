import { configs } from "@/config-registry"
import type { ConfigValue, Scope } from "@/types/config"

export const getConfig = <T>(key: string, defaultValue: T): T =>
  GM_getValue(key, defaultValue as ConfigValue) as T

export const setConfig = <T>(key: string, value: T): void => {
  GM_setValue(key, value as ConfigValue)
}

export const getScopedConfigKey = (key: string, scope: Scope): string =>
  `${key}_${scope}`

export const getEffectiveConfig = (key: string, scope: Scope): boolean => {
  const fallback =
    (configs.find(c => c.key === key)?.defaultValue as boolean) ?? false
  return (
    getConfig(key, fallback) || getConfig(getScopedConfigKey(key, scope), false)
  )
}
