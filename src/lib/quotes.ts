import { logger } from "@/utils/logger"

const MARGIN = 16

let preview: HTMLElement | null = null

const ensurePreview = (): HTMLElement => {
  if (preview) return preview
  preview = document.createElement("div")
  preview.id = "fcx-quote-preview"
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
    Math.min(e.clientY + MARGIN, window.innerHeight - h - MARGIN)
  )
  preview.style.left = `${x}px`
  preview.style.top = `${y}px`
}

const hidePreview = () => {
  if (preview) preview.style.display = "none"
}

const targetSection = (id: string): HTMLElement | null =>
  document.getElementById(`post${id}`)?.closest("section") ?? null

const quoteTargetId = (squote: Element): string | null => {
  const a = squote.querySelector<HTMLAnchorElement>(":scope > .quote a[href]")
  const m = a?.getAttribute("href")?.match(/#post(\d+)|[?&]p=(\d+)/)
  return m ? (m[1] ?? m[2]) : null
}

const processMessage = (msg: HTMLElement) => {
  if (msg.dataset.fcxq) return
  msg.dataset.fcxq = "1"
  const squotes = Array.from(
    msg.querySelectorAll<HTMLElement>(".squote")
  ).filter(sq => !sq.parentElement?.closest(".squote"))

  const line = document.createElement("div")
  line.className = "fcx-quotes"
  for (const sq of squotes) {
    const id = quoteTargetId(sq)
    if (!id || !targetSection(id)) continue
    const name = sq.querySelector(".quote b")?.textContent?.trim() ?? "post"
    const link = document.createElement("a")
    link.className = "fcx-ql"
    link.dataset.id = id
    link.textContent = `»${name}`
    line.append(link)
    sq.remove()
  }
  if (line.childElementCount) msg.before(line)
}

const processAll = (root: ParentNode = document) => {
  for (const msg of root.querySelectorAll<HTMLElement>('[id^="post_message_"]'))
    processMessage(msg)
}

const toggleInline = (link: HTMLElement) => {
  const id = link.dataset.id
  const line = link.closest<HTMLElement>(".fcx-quotes")
  if (!id || !line) return

  let sib = line.nextElementSibling
  while (sib?.classList.contains("fcx-inline")) {
    const next = sib.nextElementSibling
    if ((sib as HTMLElement).dataset.for === id) {
      sib.remove()
      return
    }
    sib = next
  }

  const target = targetSection(id)
  if (!target) return
  const box = document.createElement("div")
  box.className = "fcx-inline"
  box.dataset.for = id
  box.append(target.cloneNode(true))
  line.after(box)
}

const closestQL = (t: EventTarget | null): HTMLElement | null =>
  t instanceof HTMLElement ? t.closest(".fcx-ql") : null

export const initQuotes = () => {
  processAll()
  const posts = document.getElementById("posts")
  if (posts) {
    new MutationObserver(muts => {
      for (const m of muts)
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement) processAll(n)
    }).observe(posts, { childList: true, subtree: true })
  }

  document.addEventListener("mouseover", e => {
    const link = closestQL(e.target)
    const target = link && targetSection(link.dataset.id ?? "")
    if (!target) return
    const el = ensurePreview()
    el.innerHTML = target.outerHTML
    el.style.display = "block"
    position(e)
  })
  document.addEventListener("mousemove", e => {
    if (preview?.style.display === "block") position(e)
  })
  document.addEventListener("mouseout", e => {
    if (closestQL(e.target)) hidePreview()
  })
  document.addEventListener("click", e => {
    const link = closestQL(e.target)
    if (!link) return
    e.preventDefault()
    toggleInline(link)
    hidePreview()
  })
  logger.log("Quote tree enabled.")
}
