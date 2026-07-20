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

const POST_MESSAGE_PREFIX = "post_message_"

// Reverse index: quoted post id -> (quoting post id -> author name). Pages are
// loaded out of order and on scroll, so a post is often quoted before it exists
// in the DOM; entries are kept regardless and rendered whenever the target shows
// up (see the renderBacklinks call for the post's own id in processMessage).
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

/**
 * Draw the "quoted by" line into the post header, next to the avatar/username.
 * Idempotent: the line is rebuilt from the index on every call, so it can be
 * invoked again whenever a new quoting post arrives.
 */
const renderBacklinks = (id: string) => {
  const entries = backlinks.get(id)
  if (!entries?.size) return

  // #post<id> is the .postbit_wrapper itself; its first row holds the header,
  // whose first group is the avatar + username block.
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

    // Record the backlink even when the quoted post isn't loaded yet — it may
    // arrive on a later page, and renderBacklinks is a no-op until it does.
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

  // Posts that quoted this one may have been processed before it existed.
  if (ownId) renderBacklinks(ownId)
}

const processAll = (root: ParentNode = document) => {
  for (const msg of root.querySelectorAll<HTMLElement>('[id^="post_message_"]'))
    processMessage(msg)
}

/**
 * Where an expanded post gets inserted. Backlinks live inside the header's flex
 * row, so anchor them below the whole header instead — inserting into the row
 * would lay the expanded post out as a flex item and wreck the header.
 */
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
