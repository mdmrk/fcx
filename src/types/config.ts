export type ConfigValue = string | number | boolean

export interface ConfigDefinition {
  key: string
  label: string
  description: string
  defaultValue: ConfigValue
  type: "checkbox" | "text" | "number"
  scopes?: ("new" | "old")[]
}
