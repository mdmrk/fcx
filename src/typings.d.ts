type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONSerializable }
  | JSONSerializable[]

declare global {
  // Fix the TypeScript error
  // "Cannot find module './style.css' or its corresponding type declarations."
  declare module "*.css" {
    const content: string
    export default content
  }

  // Declare needed GM APIs.
  // Ref: https://www.tampermonkey.net/documentation.php?locale=en#api

  /**
   * Adds the given style to the document and returns the injected style element.
   * @param code The CSS code to inject.
   */
  declare function GM_addStyle(code: string): HTMLStyleElement

  /**
   * The getValue function allows a userscript to retrieve the value of a specific key in the userscript's storage. It takes two parameters:
   * @param key A string specifying the key for which the value should be retrieved.
   * @param defaultValue A default value to be returned if the key does not exist in the userscript's storage. This default value can be of any type (string, number, object, etc.).
   * @returns The value of the specified key from the userscript's storage, or the default value if the key does not exist.
   */
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

  /**setValue
   * Sets a key / value pair for current script to storage.
   * @param key: string
   * The unique name for value within this script.
   * @param value: any
   * The value to be stored, which must be JSON serializable (string, number, boolean, null, or an array/object consisting *of these types) so for example you can't store DOM elements or objects with cyclic dependencies.
   */
  declare function GM_setValue(key: string, value: JSONSerializable): void

  /**
   * Register a menu to be displayed at the Tampermonkey menu.
   * @param caption The menu item's caption.
   * @param onClick The function to be called when the menu item is clicked.
   * @param accessKey A keyboard shortcut for the menu item.
   */
  declare function GM_registerMenuCommand(
    caption: string,
    onClick: (mouseEvent: MouseEvent | KeyboardEvent) => void,
    accessKey?: string
  ): void
}

export {}
