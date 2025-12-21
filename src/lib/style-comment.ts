import { devMode, theme } from "@/config"
import type { SelectorConfig } from "@/types/adapter"

/**
 * Transforms a single comment element.
 * Moves the avatar and applies a new layout class.
 */
export const styleComment = (
  element: HTMLElement,
  selectors: SelectorConfig
) => {
  if (element.dataset.processed === "true") return

  element.dataset.processed = "true"
  element.classList.add(theme.enhancedCommentClass)

  // const avatar = element.querySelector<HTMLElement>(selectors.avatar)
  // const content = element.querySelector<HTMLElement>(selectors.content)

  // if (avatar && content) {
  // 	const sidebar = document.createElement("div")
  // 	sidebar.className = "my-custom-sidebar"
  // 	sidebar.appendChild(avatar)
  // 	element.prepend(sidebar)

  // 	if (devMode) console.log("Restyled comment:", element)
  // }
}
