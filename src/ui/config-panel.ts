import { configs } from "@/config-registry"
import type { ConfigDefinition, Scope } from "@/types/config"
import { getConfig, getScopedConfigKey, setConfig } from "@/utils/storage"

const SCOPES: Scope[] = ["new", "old"]

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

const hasScope = (item: ConfigDefinition, scope: Scope) =>
  !item.scopes || item.scopes.includes(scope)

const createCheckbox = (checked: boolean, onChange: (val: boolean) => void) => {
  const input = el("input")
  input.type = "checkbox"
  input.checked = checked
  input.onchange = () => onChange(input.checked)
  return input
}

const createNumberInput = (item: ConfigDefinition) => {
  const { key, min, max } = item
  const input = el("input", "fcx-number")
  input.type = "number"
  let value = getConfig(key, item.defaultValue as number)
  input.value = String(value)
  if (min !== undefined) input.min = String(min)
  if (max !== undefined) input.max = String(max)
  input.onchange = () => {
    const raw = Number(input.value)
    let v = Number.isFinite(raw) ? Math.round(raw) : value
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    value = v
    input.value = String(v)
    setConfig(key, v)
  }
  return input
}

const renderRow = (item: ConfigDefinition) => {
  const tdName = el("td")
  tdName.append(
    el("div", "fcx-label", item.label),
    el("span", "fcx-desc", item.description)
  )

  const tdGeneral = el("td", "fcx-col-chk")
  const scoped = SCOPES.map(scope => {
    const td = el("td", "fcx-col-chk")
    if (item.type === "checkbox" && hasScope(item, scope)) {
      const key = getScopedConfigKey(item.key, scope)
      td.append(createCheckbox(getConfig(key, false), v => setConfig(key, v)))
    }
    return td
  })

  if (item.type === "number") {
    tdGeneral.append(createNumberInput(item))
  } else {
    const setDisabled = (general: boolean) => {
      for (const td of scoped) td.classList.toggle("fcx-disabled", general)
    }
    const checked = getConfig(item.key, item.defaultValue as boolean)
    tdGeneral.append(
      createCheckbox(checked, v => {
        setConfig(item.key, v)
        setDisabled(v)
      })
    )
    setDisabled(checked)
  }

  const tr = el("tr")
  tr.append(tdName, tdGeneral, ...scoped)
  return tr
}

const resetAll = () => {
  for (const c of configs) {
    setConfig(c.key, c.defaultValue)
    if (c.type !== "checkbox") continue
    for (const scope of SCOPES) {
      if (hasScope(c, scope)) setConfig(getScopedConfigKey(c.key, scope), false)
    }
  }
}

export const toggleConfigPanel = () => {
  if (document.getElementById("fcx-config-panel")) closePanel()
  else openPanel()
}

const openPanel = () => {
  const backdrop = el("div")
  backdrop.id = "fcx-config-backdrop"
  backdrop.onclick = closePanel

  const panel = el("div")
  panel.id = "fcx-config-panel"

  const header = el("div", undefined, "Configuración FCX")
  header.id = "fcx-config-header"

  const content = el("div")
  content.id = "fcx-config-content"

  const table = el("table")
  table.id = "fcx-config-table"

  const trHead = el("tr")
  trHead.append(
    el("th", "fcx-col-opt", "Opción"),
    el("th", "fcx-col-chk", "General"),
    el("th", "fcx-col-chk", "Nuevo"),
    el("th", "fcx-col-chk", "Antiguo")
  )
  const thead = el("thead")
  thead.append(trHead)

  const tbody = el("tbody")
  tbody.append(...configs.map(renderRow))
  table.append(thead, tbody)
  content.append(table)

  const footer = el("div")
  footer.id = "fcx-footer"
  const closeLink = el("a", undefined, "Cerrar")
  closeLink.onclick = closePanel
  const resetLink = el("a", undefined, "Restaurar todo")
  resetLink.onclick = () => {
    if (!confirm("¿Restaurar toda la configuración?")) return
    resetAll()
    closePanel()
    openPanel()
  }
  footer.append(resetLink, " | ", closeLink)

  panel.append(header, content, footer)
  document.body.append(backdrop, panel)

  requestAnimationFrame(() => {
    backdrop.style.opacity = "1"
    panel.style.opacity = "1"
    panel.style.transform = "translate(-50%, -50%) scale(1)"
  })
}

const closePanel = () => {
  const b = document.getElementById("fcx-config-backdrop")
  const p = document.getElementById("fcx-config-panel")
  if (!b || !p) return
  b.style.opacity = "0"
  p.style.opacity = "0"
  setTimeout(() => {
    b.remove()
    p.remove()
  }, 200)
}
