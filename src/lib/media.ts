import { createFloatingPreview } from "@/utils/floating-preview"
import { logger } from "@/utils/logger"

const isPostImage = (t: EventTarget | null): t is HTMLImageElement =>
  t instanceof HTMLImageElement && t.classList.contains("imgpost")

const isHoverable = (t: EventTarget | null): t is HTMLImageElement =>
  isPostImage(t) ||
  (t instanceof HTMLImageElement &&
    t.classList.contains("thread-profile-image"))

export const initMedia = () => {
  const preview = createFloatingPreview("img", "fcx-media-preview", true)

  document.addEventListener("mouseover", e => {
    const img = e.target
    if (!isHoverable(img) || img.classList.contains("fcx-expanded")) return
    preview.show(e, el => {
      el.src = img.currentSrc || img.src
    })
  })
  document.addEventListener("mouseout", e => {
    if (isHoverable(e.target)) preview.hide()
  })
  document.addEventListener(
    "click",
    e => {
      if (!isPostImage(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      e.target.classList.toggle("fcx-expanded")
      preview.hide()
    },
    true
  )
  logger.log("Media hover/expand enabled.")
}
