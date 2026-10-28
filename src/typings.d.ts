type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONSerializable }
  | JSONSerializable[]

declare global {
  declare module "*.css" {
    const content: string
    export default content
  }

  declare function GM_addStyle(code: string): HTMLStyleElement

  declare function GM_getValue<T extends JSONSerializable>(
    key: string,
    defaultValue: T
  ): T
  declare function GM_getValue<T extends JSONSerializable>(
    key?: null,
    defaultValue: T
  ): T
  declare function GM_getValue<T extends JSONSerializable>(key?: string): T
  declare function GM_getValue(): undefined

  declare function GM_setValue(key: string, value: JSONSerializable): void

  declare function GM_registerMenuCommand(
    caption: string,
    onClick: (mouseEvent: MouseEvent | KeyboardEvent) => void,
    accessKey?: string
  ): void
}

export {}
