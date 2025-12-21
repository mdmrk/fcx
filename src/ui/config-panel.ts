import { configs } from "@/config-registry"
import { ConfigSection, type ConfigDefinition } from "@/types/config"
import { getConfig, setConfig, resetConfig } from "@/utils/storage"

const STYLES = `
#fcx-config-backdrop {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 9998;
}
#fcx-config-panel {
    position: fixed; top: 50%; left: 50%; width: 1000px; max-width: 95%; max-height: 90vh;
    transform: translate(-50%, -50%) scale(0.95);
    background: #1e1e1e; color: #ccc; border-radius: 4px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 9999;
    opacity: 0;
    display: flex; flex-direction: column; font-size: 13px;
    border: 1px solid #444;
}
#fcx-config-header {
    background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);
    padding: 8px 10px; border-bottom: 1px solid #000;
    font-weight: bold; color: #fff;
}

#fcx-config-content {
    flex: 1; overflow-y: auto; padding: 10px;
}
fieldset.fcx-group {
    border: 1px solid #444; margin: 0 0 10px 0; padding: 5px 10px;
}
fieldset.fcx-group legend {
    color: #fe5e00; font-weight: bold; padding: 0 4px;
}
.fcx-item {
    margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between;
}
.fcx-item label {
    cursor: pointer; color: #eee;
}
.fcx-item label:hover { color: #fff; }
.fcx-desc {
    color: #888; margin-left: 4px;
}
.fcx-reset {
    background: transparent; border: none; color: #666; cursor: pointer;
    font-size: 10px; padding: 0 4px; margin-left: auto;
}
.fcx-reset:hover { color: #fe5e00; }
#fcx-footer {
    border-top: 1px solid #333; padding: 5px 10px;
    background: #1a1a1a; text-align: right;
    font-size: 11px; color: #666;
}
#fcx-footer a { color: #888; text-decoration: none; margin-left: 10px; cursor: pointer; }
#fcx-footer a:hover { color: #ccc; }
`

const renderItem = (item: ConfigDefinition) => {
  const div = document.createElement("div")
  div.className = "fcx-item"
  div.dataset.name = item.label

  const left = document.createElement("div")

  const label = document.createElement("label")
  const input = document.createElement("input")
  input.type = "checkbox"
  input.style.marginRight = "5px"
  input.style.verticalAlign = "middle"
  input.checked = getConfig(item.key, item.defaultValue)

  input.onchange = e => {
    setConfig(item.key, (e.target as HTMLInputElement).checked)
  }

  label.append(input, item.label)

  const desc = document.createElement("span")
  desc.className = "fcx-desc"
  desc.textContent = `: ${item.description || ""}`

  left.append(label, desc)

  const reset = document.createElement("button")
  reset.className = "fcx-reset"
  reset.textContent = "Reset"
  reset.title = "Restaurar valores predeterminados"
  reset.onclick = () => {
    resetConfig(item.key, item.defaultValue)
    input.checked = item.defaultValue as boolean
    setConfig(item.key, item.defaultValue)
  }

  div.append(left, reset)
  return div
}

export const toggleConfigPanel = () => {
  if (document.getElementById("fcx-config-panel")) {
    closePanel()
    return
  }
  openPanel()
}

const openPanel = () => {
  if (!document.getElementById("fcx-styles")) {
    const styleInfo = document.createElement("style")
    styleInfo.id = "fcx-styles"
    styleInfo.textContent = STYLES
    document.head.append(styleInfo)
  }

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

  const sections = Object.values(ConfigSection)

  sections.forEach(sec => {
    const currentItems = configs.filter(c => c.section === sec)
    if (currentItems.length > 0) {
      const fieldset = document.createElement("fieldset")
      fieldset.className = "fcx-group"
      const legend = document.createElement("legend")
      legend.textContent = sec
      fieldset.append(legend)

      currentItems.forEach(item => {
        fieldset.append(renderItem(item))
      })
      content.append(fieldset)
    } else {
      const msg = document.createElement("div")
      msg.style.padding = "20px"
      msg.style.color = "#666"
      msg.textContent = "No hay opciones en esta sección aún."
      content.append(msg)
    }
  })

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
        resetConfig(c.key, c.defaultValue)
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
