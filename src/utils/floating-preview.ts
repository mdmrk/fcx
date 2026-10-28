const MARGIN = 16

export const createFloatingPreview = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  id: string,
  centerY: boolean
) => {
  let el: HTMLElementTagNameMap[K] | null = null

  const move = (e: MouseEvent) => {
    if (el?.style.display !== "block") return
    const { offsetWidth: w, offsetHeight: h } = el
    let x = e.clientX + MARGIN
    if (x + w > window.innerWidth) x = e.clientX - MARGIN - w
    const top = centerY ? e.clientY - h / 2 : e.clientY + MARGIN
    const y = Math.max(MARGIN, Math.min(top, window.innerHeight - h - MARGIN))
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }

  document.addEventListener("mousemove", move)

  return {
    show(e: MouseEvent, fill: (el: HTMLElementTagNameMap[K]) => void) {
      if (!el) {
        el = document.createElement(tag)
        el.id = id
        document.body.append(el)
      }
      fill(el)
      el.style.display = "block"
      move(e)
    },
    hide() {
      if (el) el.style.display = "none"
    },
  }
}
