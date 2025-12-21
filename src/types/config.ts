export enum ConfigSection {
  COMMON = "General",
  NEW_INTERFACE = "Nueva Interfaz",
  OLD_INTERFACE = "Antigua Interfaz",
}

export interface ConfigDefinition<T = any> {
  key: string
  section: ConfigSection
  label: string
  description?: string
  defaultValue: T
  type: "checkbox" | "text" | "number"
}

export type ConfigValue = string | number | boolean
