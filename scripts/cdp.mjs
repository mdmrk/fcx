#!/usr/bin/env node
// Minimal Chrome DevTools Protocol client to develop FCX against the live,
// logged-in forocoches page running in a Helium (Chromium) dev instance.
//
// Start the browser first:  ./scripts/dev-browser.sh
//
// Commands (port defaults to 9222, override with CDP_PORT):
//   node scripts/cdp.mjs tabs                 list open page tabs
//   node scripts/cdp.mjs html [urlMatch]      dump the page's full HTML
//   node scripts/cdp.mjs sel '<css>' [match]  test a selector: count + samples
//   node scripts/cdp.mjs eval '<js>' [match]  evaluate JS in the page, print result
//   node scripts/cdp.mjs inject [urlMatch]    inject dist/fcx.user.js (with GM shims)
//
// `urlMatch` picks the tab whose URL contains that substring (default: first
// forocoches tab, else the first page tab).

const PORT = process.env.CDP_PORT || "9222"
const BASE = `http://localhost:${PORT}`

async function listTargets() {
  const res = await fetch(`${BASE}/json`).catch(() => null)
  if (!res) {
    console.error(
      `No CDP on ${BASE}. Start the dev browser: ./scripts/dev-browser.sh`
    )
    process.exit(1)
  }
  const targets = await res.json()
  return targets.filter(t => t.type === "page")
}

function pickTarget(pages, match) {
  if (match) {
    const hit = pages.find(p => p.url.includes(match))
    if (hit) return hit
  }
  return pages.find(p => p.url.includes("forocoches.com")) || pages[0]
}

function send(ws, id, method, params) {
  ws.send(JSON.stringify({ id, method, params }))
}

// Open a websocket to a target and run one Runtime.evaluate, resolving its value.
function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener("error", () => reject(new Error("websocket error")))
    ws.addEventListener("open", () => {
      send(ws, 1, "Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
    })
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== 1) return
      ws.close()
      if (msg.result?.exceptionDetails) {
        reject(new Error(msg.result.exceptionDetails.text || "eval exception"))
      } else {
        resolve(msg.result?.result?.value)
      }
    })
  })
}

const [cmd, arg1, arg2] = process.argv.slice(2)

if (cmd === "tabs") {
  const pages = await listTargets()
  for (const p of pages) console.log(`${p.url}\n    ${p.title}`)
  process.exit(0)
}

const pages = await listTargets()
if (pages.length === 0) {
  console.error("No open page tabs.")
  process.exit(1)
}

if (cmd === "html") {
  const t = pickTarget(pages, arg1)
  const html = await evaluate(
    t.webSocketDebuggerUrl,
    "document.documentElement.outerHTML"
  )
  console.log(html)
} else if (cmd === "sel") {
  if (!arg1) {
    console.error("usage: cdp.mjs sel '<css>' [urlMatch]")
    process.exit(1)
  }
  const t = pickTarget(pages, arg2)
  const expr = `(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(arg1)})];
    return JSON.stringify({
      count: els.length,
      samples: els.slice(0, 3).map(e => e.outerHTML.slice(0, 300)),
    }, null, 2);
  })()`
  console.log(`tab: ${t.url}`)
  console.log(await evaluate(t.webSocketDebuggerUrl, expr))
} else if (cmd === "eval") {
  if (!arg1) {
    console.error("usage: cdp.mjs eval '<js>' [urlMatch]")
    process.exit(1)
  }
  const t = pickTarget(pages, arg2)
  const val = await evaluate(t.webSocketDebuggerUrl, `(() => (${arg1}))()`)
  console.log(typeof val === "string" ? val : JSON.stringify(val, null, 2))
} else if (cmd === "inject") {
  const { readFile } = await import("node:fs/promises")
  const t = pickTarget(pages, arg1)
  const raw = await readFile("./dist/fcx.user.js", "utf8")
  const body = raw.replace(/^\/\/ ==UserScript==[\s\S]*?==\/UserScript==\n/, "")
  // Shim the GM APIs the script uses so it runs outside a userscript manager.
  const shims = `
    window.GM_addStyle = window.GM_addStyle || (css => {
      const s = document.createElement("style");
      s.textContent = css; document.head.appendChild(s); return s;
    });
    window.GM_getValue = window.GM_getValue || ((k, d) => {
      const v = localStorage.getItem("fcx_" + k);
      return v === null ? d : JSON.parse(v);
    });
    window.GM_setValue = window.GM_setValue || ((k, v) =>
      localStorage.setItem("fcx_" + k, JSON.stringify(v)));
    window.GM_registerMenuCommand = window.GM_registerMenuCommand ||
      ((c, fn) => { window.__fcxMenu = fn; console.log("[FCX] menu:", c); });
  `
  await evaluate(t.webSocketDebuggerUrl, `${shims}\n${body}\ntrue`)
  console.log(`Injected FCX into ${t.url}`)
  console.log("Open the config panel with: node scripts/cdp.mjs eval '__fcxMenu()'")
} else {
  console.error(
    "commands: tabs | html [match] | sel '<css>' [match] | eval '<js>' [match] | inject [match]"
  )
  process.exit(1)
}
