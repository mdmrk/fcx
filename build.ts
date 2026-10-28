import { watch as fswatch, type WatchListener } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { parseArgs } from "node:util"
import * as esbuild from "esbuild"
import { transform as transformCss } from "lightningcss"
import type PACKAGE_JSON from "./package.json"

const cssTextPlugin = (dev: boolean): esbuild.Plugin => ({
  name: "css-text",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async args => {
      const source = await readFile(args.path)
      const { code } = transformCss({
        filename: args.path,
        code: source,
        minify: !dev,
      })
      return { contents: code, loader: "text" }
    })
  },
})

const HEADER_ORDER = [
  "@name",
  "@namespace",
  "@version",
  "@description",
  "@license",
  "@author",
]

type HeaderValue = string | string[] | boolean
type UserScriptHeader = Record<string, HeaderValue>

const VALID_RELEASE_CHANNELS = ["GitHubRelease", "GitCommit"] as const

type ReleaseChannel = (typeof VALID_RELEASE_CHANNELS)[number]

function generateHeader(
  releaseChannel: ReleaseChannel,
  packageJson: typeof PACKAGE_JSON
): UserScriptHeader {
  if (
    !packageJson.name ||
    !packageJson.version ||
    !packageJson.description ||
    !packageJson.license ||
    !packageJson.author ||
    !packageJson.repository
  ) {
    throw new Error("Missing required fields in package.json")
  }

  const url = packageJson.repository.url.replace("git+", "").replace(".git", "")
  const distUserScript = `${packageJson.name}.user.js`
  const releaseURL =
    releaseChannel === "GitCommit"
      ? `${url}/raw/main/dist/${distUserScript}`
      : `${url}/releases/latest/download/${distUserScript}`

  const header: UserScriptHeader = {
    "@name": packageJson.name,
    "@namespace": url || packageJson.name,
    "@version": packageJson.version,
    "@description": packageJson.description,
    "@license": packageJson.license,
    "@author": packageJson.author,
    "@updateURL": releaseURL,
    "@downloadURL": releaseURL,
  }
  for (const [key, value] of Object.entries(packageJson.userscriptHeader)) {
    if (value != null) header[key] = value as HeaderValue
  }
  return header
}

function checkGrants(code: string, header: UserScriptHeader) {
  const grants = Array.isArray(header["@grant"])
    ? (header["@grant"] as string[])
    : []
  const usedApis = new Set(code.match(/\bGM[_.][A-Za-z]+/g) ?? [])

  for (const api of usedApis) {
    if (!grants.includes(api)) {
      console.error(
        `Used "${api}" api without permissions. Include it in package.json/userscriptHeader/@grant`
      )
    }
  }
  for (const api of grants) {
    if (!usedApis.has(api)) {
      console.warn(`Granted permission for "${api}" but never used`)
    }
  }
}

interface PostBuildOption {
  entrypointPath: string
  releaseChannel: ReleaseChannel
  buildSuffix?: string
}

async function postBuildScript(options: PostBuildOption): Promise<string> {
  const { entrypointPath, buildSuffix } = options
  const packageJson: typeof PACKAGE_JSON = JSON.parse(
    await readFile("./package.json", "utf8")
  )

  const header = generateHeader(options.releaseChannel, packageJson)
  if (buildSuffix) {
    header["@version"] += `.${buildSuffix}`
  }
  header["@icon"] =
    `data:image/png;base64,${(await readFile("./src/logo.png")).toString("base64")}`

  const outputPath = `${path.dirname(entrypointPath)}/${packageJson.name}.user.js`
  const data = (await readFile(entrypointPath, "utf8")).replace(
    /^\s*\/\/ .*\n/gm,
    ""
  )
  checkGrants(data, header)

  const pad = Math.max(...Object.keys(header).map(k => k.length))
  const emit = (key: string, value: HeaderValue): string => {
    if (typeof value === "boolean") return value ? `// ${key}\n` : ""
    const rows = Array.isArray(value) ? value : [value]
    return rows.map(row => `// ${key.padEnd(pad)}  ${row}\n`).join("")
  }

  let output = "// ==UserScript==\n"
  for (const key of HEADER_ORDER) {
    if (key in header) output += emit(key, header[key])
  }
  for (const key in header) {
    if (!HEADER_ORDER.includes(key)) output += emit(key, header[key])
  }
  output += "// ==/UserScript==\n\n"
  output += data

  await writeFile(outputPath, output)
  console.log(`Successfully added the header to the userscript ${outputPath}!`)
  return outputPath
}

interface BuildOption {
  dev: boolean
  releaseChannel: ReleaseChannel
}

async function runBuilderFn(option: BuildOption): Promise<string> {
  const { dev, releaseChannel } = option
  const entrypoint = "./src/index.ts"
  const entrypointPath = "./dist/index.js"

  const indexContent = await readFile(entrypoint, "utf8")
  if (/^export\s+/m.test(indexContent)) {
    throw new Error(
      "index.ts should not contain exports. Move exports to a separate file (e.g. config.ts)."
    )
  }

  console.log(`Building ${entrypoint}`)
  await esbuild.build({
    entryPoints: [entrypoint],
    outfile: entrypointPath,
    bundle: true,
    minify: false,
    sourcemap: dev ? "external" : false,
    plugins: [cssTextPlugin(dev)],
    platform: "browser",
    format: "esm",
    define: {
      __DEV__: JSON.stringify(dev),
    },
  })

  return postBuildScript({
    entrypointPath,
    releaseChannel,
    buildSuffix: dev ? Date.now().toString() : undefined,
  })
}

function watch(option: BuildOption): void {
  const listener: WatchListener<string> = (event, filename) => {
    console.log(`Detected ${event} in ${filename}`)
    runBuilderFn(option).catch(() => {})
  }
  const watchPaths = [
    `${import.meta.dirname}/src`,
    `${import.meta.dirname}/package.json`,
  ]
  for (const p of watchPaths) fswatch(p, { recursive: true }, listener)
  console.log(`Watching paths ${watchPaths.join(", ")}`)
}

function serve(userscriptPath: string): void {
  const urlPath = `/${path.basename(userscriptPath)}`
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
    if (url.pathname === "/") {
      res.writeHead(302, { Location: urlPath })
      res.end()
      return
    }
    if (url.pathname === urlPath) {
      res.writeHead(200, { "Content-Type": "text/javascript" })
      res.end(await readFile(userscriptPath))
      return
    }
    res.writeHead(302, { Location: "https://http.cat/404" })
    res.end()
  })
  server.listen(3000, () => {
    console.log("Listening on http://localhost:3000/")
  })
}

async function main() {
  const { values: argv } = parseArgs({
    options: {
      dev: { type: "boolean", default: false },
      server: { type: "boolean", default: false },
      watch: { type: "boolean", default: false },
      "release-channel": { type: "string", default: "GitCommit" },
    },
  })

  const releaseChannel = argv["release-channel"] as ReleaseChannel
  if (!VALID_RELEASE_CHANNELS.includes(releaseChannel)) {
    throw new Error(`invalid release channel ${releaseChannel}`)
  }

  const option: BuildOption = { dev: argv.dev, releaseChannel }

  const userscriptPath = await runBuilderFn(option)

  if (argv.server) serve(userscriptPath)
  if (argv.watch) watch(option)
}

await main()
