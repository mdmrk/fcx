export enum ConfigSection {
  COMMON = "General",
  NEW_INTERFACE = "Nueva Interfaz",
  OLD_INTERFACE = "Antigua Interfaz",
}

export type ConfigValue = string | number | boolean

export interface ConfigDefinition {
  key: string
  section: ConfigSection
  label: string
  description: string
  defaultValue: ConfigValue
  type: "checkbox" | "text" | "number"
}
