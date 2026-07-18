// Tabler Icons (MIT, https://tabler.io/icons): arrow-bar-to-up / arrow-bar-to-down.
const ICON_TO_TOP = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10l0 10" /><path d="M12 10l4 4" /><path d="M12 10l-4 4" /><path d="M4 4l16 0" /></svg>`
const ICON_TO_BOTTOM = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l16 0" /><path d="M12 14l0 -10" /><path d="M12 14l4 -4" /><path d="M12 14l-4 -4" /></svg>`

export const initNavButtons = () => {
  document.getElementById("scrollToTopButton")?.remove()

  const nav = document.createElement("div")
  nav.className = "fcx-nav"

  const makeButton = (icon: string, title: string, targetTop: () => number) => {
    const a = document.createElement("a")
    a.innerHTML = icon
    a.title = title
    a.onclick = () => {
      window.scrollTo({ top: targetTop(), behavior: "smooth" })
    }
    nav.append(a)
  }

  makeButton(ICON_TO_TOP, "Ir arriba", () => 0)
  makeButton(
    ICON_TO_BOTTOM,
    "Ir abajo",
    () => document.documentElement.scrollHeight
  )

  document.body.append(nav)
}
