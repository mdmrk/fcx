export type ConfigValue = string | number | boolean

export type Scope = "new" | "old"

export interface ConfigDefinition {
  key: string
  label: string
  description: string
  defaultValue: ConfigValue
  type: "checkbox" | "number"
  scopes?: Scope[]
  min?: number
  max?: number
}
