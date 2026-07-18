export type ConfigValue = string | number | boolean

export interface ConfigDefinition {
  key: string
  label: string
  description: string
  defaultValue: ConfigValue
  type: "checkbox" | "number"
  scopes?: ("new" | "old")[]
  min?: number
  max?: number
}
