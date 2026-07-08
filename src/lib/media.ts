import { logger } from "@/utils/logger"

const MARGIN = 16

let preview: HTMLImageElement | null = null

const ensurePreview = (): HTMLImageElement => {
  if (preview) return preview
  preview = document.createElement("img")
  preview.id = "fcx-media-preview"
  document.body.append(preview)
  return preview
}

const position = (e: MouseEvent) => {
  if (!preview) return
  const { offsetWidth: w, offsetHeight: h } = preview
  let x = e.clientX + MARGIN
  if (x + w > window.innerWidth) x = e.clientX - MARGIN - w
  const y = Math.max(
    MARGIN,
    Math.min(e.clientY - h / 2, window.innerHeight - h - MARGIN)
  )
  preview.style.left = `${x}px`
  preview.style.top = `${y}px`
}

const hidePreview = () => {
  if (preview) preview.style.display = "none"
}

const isPostImage = (t: EventTarget | null): t is HTMLImageElement =>
  t instanceof HTMLImageElement && t.classList.contains("imgpost")

const isHoverable = (t: EventTarget | null): t is HTMLImageElement =>
  isPostImage(t) ||
  (t instanceof HTMLImageElement &&
    t.classList.contains("thread-profile-image"))

export const initMedia = () => {
  document.addEventListener("mouseover", e => {
    if (!isHoverable(e.target) || e.target.classList.contains("fcx-expanded"))
      return
    const el = ensurePreview()
    el.src = e.target.currentSrc || e.target.src
    el.style.display = "block"
    position(e)
  })
  document.addEventListener("mousemove", e => {
    if (preview?.style.display === "block") position(e)
  })
  document.addEventListener("mouseout", e => {
    if (isHoverable(e.target)) hidePreview()
  })
  document.addEventListener(
    "click",
    e => {
      if (!isPostImage(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      e.target.classList.toggle("fcx-expanded")
      hidePreview()
    },
    true
  )
  logger.log("Media hover/expand enabled.")
}
