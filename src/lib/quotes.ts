import { createFloatingPreview } from "@/utils/floating-preview"
import { logger } from "@/utils/logger"

const POST_MESSAGE_PREFIX = "post_message_"

const backlinks = new Map<string, Map<string, string>>()

const targetSection = (id: string): HTMLElement | null =>
  document.getElementById(`post${id}`)?.closest("section") ?? null

const postAuthor = (id: string): string =>
  document
    .getElementById(`postmenu_${id}`)
    ?.querySelector("a")
    ?.textContent?.trim() ?? "post"

const isOpPost = (id: string): boolean => {
  const wrapper = document.getElementById(`post${id}`)
  for (const el of wrapper?.querySelectorAll(".date-and-time-gray") ?? []) {
    const text = el.textContent?.trim()
    if (text && /^#\d+$/.test(text)) return text === "#1"
  }
  return false
}

const makeQuoteLink = (id: string, name: string): HTMLAnchorElement => {
  const link = document.createElement("a")
  link.className = "fcx-ql"
  link.dataset.id = id
  link.textContent = `»${name}${isOpPost(id) ? " (OP)" : ""}`
  return link
}

const renderBacklinks = (id: string) => {
  const entries = backlinks.get(id)
  if (!entries?.size) return

  const header = document.getElementById(`post${id}`)?.firstElementChild
  const group = header?.firstElementChild
  if (!group) return

  let line = group.querySelector<HTMLElement>(":scope > .fcx-backlinks")
  if (!line) {
    line = document.createElement("div")
    line.className = "fcx-backlinks"
    group.append(line)
  }

  line.textContent = ""
  for (const [quoterId, name] of entries) {
    line.append(makeQuoteLink(quoterId, name))
  }
}

const quoteTargetId = (squote: Element): string | null => {
  const a = squote.querySelector<HTMLAnchorElement>(":scope > .quote a[href]")
  const m = a?.getAttribute("href")?.match(/#post(\d+)|[?&]p=(\d+)/)
  return m ? (m[1] ?? m[2]) : null
}

const processMessage = (msg: HTMLElement) => {
  if (msg.dataset.fcxq) return
  msg.dataset.fcxq = "1"
  const ownId = msg.id.startsWith(POST_MESSAGE_PREFIX)
    ? msg.id.slice(POST_MESSAGE_PREFIX.length)
    : ""
  const squotes = Array.from(
    msg.querySelectorAll<HTMLElement>(".squote")
  ).filter(sq => !sq.parentElement?.closest(".squote"))

  const line = document.createElement("div")
  line.className = "fcx-quotes"
  for (const sq of squotes) {
    const id = quoteTargetId(sq)
    if (!id) continue

    if (ownId && id !== ownId) {
      let entry = backlinks.get(id)
      if (!entry) {
        entry = new Map()
        backlinks.set(id, entry)
      }
      entry.set(ownId, postAuthor(ownId))
      renderBacklinks(id)
    }

    if (!targetSection(id)) continue
    const name = sq.querySelector(".quote b")?.textContent?.trim() ?? "post"
    line.append(makeQuoteLink(id, name))
    sq.remove()
  }
  if (line.childElementCount) msg.before(line)

  if (ownId) renderBacklinks(ownId)
}

const processAll = (root: ParentNode = document) => {
  for (const msg of root.querySelectorAll<HTMLElement>('[id^="post_message_"]'))
    processMessage(msg)
}

const inlineAnchor = (line: HTMLElement): HTMLElement => {
  if (!line.classList.contains("fcx-backlinks")) return line
  const header = line.closest(".postbit_wrapper")?.firstElementChild
  return header instanceof HTMLElement ? header : line
}

const toggleInline = (link: HTMLElement) => {
  const id = link.dataset.id
  const line = link.closest<HTMLElement>(".fcx-quotes, .fcx-backlinks")
  if (!id || !line) return
  const anchor = inlineAnchor(line)

  let sib = anchor.nextElementSibling
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
  anchor.after(box)
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

  const preview = createFloatingPreview("div", "fcx-quote-preview", false)

  document.addEventListener("mouseover", e => {
    const link = closestQL(e.target)
    const target = link && targetSection(link.dataset.id ?? "")
    if (!target) return
    preview.show(e, el => {
      el.innerHTML = target.outerHTML
    })
  })
  document.addEventListener("mouseout", e => {
    if (closestQL(e.target)) preview.hide()
  })
  document.addEventListener("click", e => {
    const link = closestQL(e.target)
    if (!link) return
    e.preventDefault()
    toggleInline(link)
    preview.hide()
  })
  logger.log("Quote tree enabled.")
}
