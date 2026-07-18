import { configs } from "@/config-registry"
import type { ConfigDefinition } from "@/types/config"
import { getConfig, getScopedConfigKey, setConfig } from "@/utils/storage"

const createCheckbox = (checked: boolean, onChange: (val: boolean) => void) => {
  const input = document.createElement("input")
  input.type = "checkbox"
  input.checked = checked
  input.onchange = e => {
    onChange((e.target as HTMLInputElement).checked)
  }
  return input
}

const createNumberInput = (
  value: number,
  min: number | undefined,
  max: number | undefined,
  onChange: (val: number) => void
) => {
  const input = document.createElement("input")
  input.type = "number"
  input.className = "fcx-number"
  input.value = String(value)
  if (min !== undefined) input.min = String(min)
  if (max !== undefined) input.max = String(max)
  input.onchange = e => {
    const raw = Number((e.target as HTMLInputElement).value)
    let v = Number.isFinite(raw) ? Math.round(raw) : value
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    input.value = String(v)
    onChange(v)
  }
  return input
}

// A global numeric setting: value lives in the "General" column; the per-interface
// columns don't apply.
const renderNumberRow = (item: ConfigDefinition) => {
  const tr = document.createElement("tr")

  const tdName = document.createElement("td")
  const label = document.createElement("div")
  label.className = "fcx-label"
  label.textContent = item.label
  const desc = document.createElement("span")
  desc.className = "fcx-desc"
  desc.textContent = item.description
  tdName.append(label, desc)

  const tdValue = document.createElement("td")
  tdValue.className = "fcx-col-chk"
  tdValue.append(
    createNumberInput(
      getConfig(item.key, item.defaultValue as number),
      item.min,
      item.max,
      val => setConfig(item.key, val)
    )
  )

  const tdNew = document.createElement("td")
  tdNew.className = "fcx-col-chk"
  const tdOld = document.createElement("td")
  tdOld.className = "fcx-col-chk"

  tr.append(tdName, tdValue, tdNew, tdOld)
  return tr
}

const renderRow = (item: ConfigDefinition) => {
  const tr = document.createElement("tr")

  // Name Column
  const tdName = document.createElement("td")
  const label = document.createElement("div")
  label.className = "fcx-label"
  label.textContent = item.label
  const desc = document.createElement("span")
  desc.className = "fcx-desc"
  desc.textContent = item.description
  tdName.append(label, desc)

  // General Column
  const tdGeneral = document.createElement("td")
  tdGeneral.className = "fcx-col-chk"
  const generalChecked = getConfig(item.key, item.defaultValue as boolean)

  const updateRowState = (isGeneralChecked: boolean) => {
    if (isGeneralChecked) {
      tdNew.classList.add("fcx-disabled")
      tdOld.classList.add("fcx-disabled")
    } else {
      tdNew.classList.remove("fcx-disabled")
      tdOld.classList.remove("fcx-disabled")
    }
  }

  const checkGeneral = createCheckbox(generalChecked, val => {
    setConfig(item.key, val)
    updateRowState(val)
  })
  tdGeneral.append(checkGeneral)

  // New Column
  const tdNew = document.createElement("td")
  tdNew.className = "fcx-col-chk"
  if (!item.scopes || item.scopes.includes("new")) {
    const keyNew = getScopedConfigKey(item.key, "new")
    const checkNew = createCheckbox(
      getConfig(keyNew, false as boolean), // Default false for overrides
      val => setConfig(keyNew, val)
    )
    tdNew.append(checkNew)
  }

  // Old Column
  const tdOld = document.createElement("td")
  tdOld.className = "fcx-col-chk"
  if (!item.scopes || item.scopes.includes("old")) {
    const keyOld = getScopedConfigKey(item.key, "old")
    const checkOld = createCheckbox(
      getConfig(keyOld, false as boolean), // Default false for overrides
      val => setConfig(keyOld, val)
    )
    tdOld.append(checkOld)
  }

  updateRowState(generalChecked)

  tr.append(tdName, tdGeneral, tdNew, tdOld)
  return tr
}

export const toggleConfigPanel = () => {
  if (document.getElementById("fcx-config-panel")) {
    closePanel()
    return
  }
  openPanel()
}

const openPanel = () => {
  const backdrop = document.createElement("div")
  backdrop.id = "fcx-config-backdrop"
  backdrop.onclick = closePanel

  const panel = document.createElement("div")
  panel.id = "fcx-config-panel"

  const header = document.createElement("div")
  header.id = "fcx-config-header"
  header.textContent = "Configuración FCX"

  const content = document.createElement("div")
  content.id = "fcx-config-content"

  const table = document.createElement("table")
  table.id = "fcx-config-table"

  const thead = document.createElement("thead")
  const trHead = document.createElement("tr")
  const thName = document.createElement("th")
  thName.className = "fcx-col-opt"
  thName.textContent = "Opción"
  const thGen = document.createElement("th")
  thGen.className = "fcx-col-chk"
  thGen.textContent = "General"
  const thNew = document.createElement("th")
  thNew.className = "fcx-col-chk"
  thNew.textContent = "Nuevo"
  const thOld = document.createElement("th")
  thOld.className = "fcx-col-chk"
  thOld.textContent = "Antiguo"

  trHead.append(thName, thGen, thNew, thOld)
  thead.append(trHead)
  table.append(thead)

  const tbody = document.createElement("tbody")
  configs.forEach(item => {
    if (item.type === "checkbox") {
      tbody.append(renderRow(item))
    } else if (item.type === "number") {
      tbody.append(renderNumberRow(item))
    }
  })
  table.append(tbody)
  content.append(table)

  const footer = document.createElement("div")
  footer.id = "fcx-footer"
  const closeLink = document.createElement("a")
  closeLink.textContent = "Cerrar"
  closeLink.onclick = closePanel

  const resetLink = document.createElement("a")
  resetLink.textContent = "Restaurar todo"
  resetLink.onclick = () => {
    if (confirm("¿Restaurar toda la configuración?")) {
      configs.forEach(c => {
        setConfig(c.key, c.defaultValue)
        if (c.type !== "checkbox") return
        if (!c.scopes || c.scopes.includes("new")) {
          setConfig(getScopedConfigKey(c.key, "new"), false)
        }
        if (!c.scopes || c.scopes.includes("old")) {
          setConfig(getScopedConfigKey(c.key, "old"), false)
        }
      })
      closePanel()
      openPanel()
    }
  }
  footer.append(resetLink, document.createTextNode(" | "), closeLink)

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
  if (b && p) {
    b.style.opacity = "0"
    p.style.opacity = "0"
    setTimeout(() => {
      b.remove()
      p.remove()
    }, 200)
  }
}
