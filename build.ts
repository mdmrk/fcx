import { watch as fswatch, type WatchListener } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { inspect } from "node:util"
import * as esbuild from "esbuild"
import winston from "winston"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import type PACKAGE_JSON from "./package.json"

const allGMApis = [
  "unsafeWindow",
  "GM_addElement",
  "GM_addStyle",
  "GM_download",
  "GM_getResourceText",
  "GM_getResourceURL",
  "GM_info",
  "GM_log",
  "GM_notification",
  "GM_openInTab",
  "GM_registerMenuCommand",
  "GM_unregisterMenuCommand",
  "GM_setClipboard",
  "GM_getTab",
  "GM_saveTab",
  "GM_getTabs",
  "GM_setValue",
  "GM_getValue",
  "GM_deleteValue",
  "GM_listValues",
  "GM_setValues",
  "GM_getValues",
  "GM_deleteValues",
  "GM_addValueChangeListener",
  "GM_removeValueChangeListener",
  "GM_xmlhttpRequest",
  "GM_webRequest",
  "GM_cookie.list",
  "GM_cookie.set",
  "GM_cookie.delete",
  "GM.addElement",
  "GM.addStyle",
  "GM.download",
  "GM.getResourceText",
  "GM.getResourceURL",
  "GM.info",
  "GM.log",
  "GM.notification",
  "GM.openInTab",
  "GM.registerMenuCommand",
  "GM.unregisterMenuCommand",
  "GM.setClipboard",
  "GM.getTab",
  "GM.saveTab",
  "GM.getTabs",
  "GM.setValue",
  "GM.getValue",
  "GM.deleteValue",
  "GM.listValues",
  "GM.setValues",
  "GM.getValues",
  "GM.deleteValues",
  "GM.addValueChangeListener",
  "GM.removeValueChangeListener",
  "GM.xmlhttpRequest",
  "GM.webRequest",
  "GM.cookie.list",
  "GM.cookie.set",
  "GM.cookie.delete",
]

const allGMApisMatcher = new RegExp(allGMApis.join("|"), "g")

const consoleTransport = new winston.transports.Console()
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.cli(),
    winston.format.printf(
      info =>
        `${info.timestamp} ${info.level}: ${info.message}` +
        (info.splat !== undefined ? `${info.splat}` : " ")
    )
  ),
  transports: [consoleTransport],
  exceptionHandlers: [consoleTransport],
  rejectionHandlers: [consoleTransport],
  exitOnError: false,
})

// Imports of style files (e.g. `import STYLES from "@/style.css"`) resolve to the
// file's raw text, injected at runtime via GM_addStyle.
const cssTextPlugin: esbuild.Plugin = {
  name: "css-text",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async args => {
      const contents = await readFile(args.path, "utf8")
      return { contents, loader: "text" }
    })
  },
}

const MINIMAL_USER_SCRIPT_HEADER_ITEMS = [
  "@name",
  "@namespace",
  "@version",
  "@description",
  "@license",
  "@author",
] as const

const MINIMAL_USER_SCRIPT_HEADER_SET: Set<
  (typeof MINIMAL_USER_SCRIPT_HEADER_ITEMS)[number]
> = new Set(MINIMAL_USER_SCRIPT_HEADER_ITEMS)

type MinimalUserScriptHeader = {
  [K in (typeof MINIMAL_USER_SCRIPT_HEADER_ITEMS)[number]]:
    | string[]
    | string
    | boolean
}

type UserScriptHeader = MinimalUserScriptHeader & {
  [k: string]: string[] | string | boolean
}

const VALID_RELEASE_CHANNELS = [
  "GitHubRelease",
  "GitCommit",
  "OutOfBand",
] as const

type ReleaseChannel = (typeof VALID_RELEASE_CHANNELS)[number]

function generateReleaseURL(
  releaseChannel: ReleaseChannel,
  inputs: { repoURL: string; name: string }
): string {
  if (releaseChannel === "OutOfBand") {
    return ""
  }

  const distUserScript = `${inputs.name}.user.js`
  const url = inputs.repoURL.replace("git+", "").replace(".git", "")

  if (releaseChannel === "GitCommit") {
    return `${url}/raw/main/dist/${distUserScript}`
  } else if (releaseChannel === "GitHubRelease") {
    return `${url}/releases/latest/download/${distUserScript}`
  }
  throw new Error(`invalid release channel ${releaseChannel}`)
}

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

  const url = (packageJson.repository as { url: string }).url
    .replace("git+", "")
    .replace(".git", "")

  const releaseURL = generateReleaseURL(releaseChannel, {
    name: packageJson.name,
    repoURL: (packageJson.repository as { url: string }).url,
  })

  const releaseHeader = releaseURL
    ? {
        "@updateURL": releaseURL,
        "@downloadURL": releaseURL,
      }
    : null

  const defaultHeader: MinimalUserScriptHeader = {
    "@name": packageJson.name,
    "@namespace": url || packageJson.name,
    "@version": packageJson.version,
    "@description": packageJson.description,
    "@license": packageJson.license,
    "@author": packageJson.author.toString(),
  }
  const header: UserScriptHeader = {
    ...defaultHeader,
    ...releaseHeader,
  }

  for (const key in packageJson.userscriptHeader) {
    const value =
      packageJson.userscriptHeader[
        key as keyof typeof packageJson.userscriptHeader
      ]
    if (typeof key !== "string") {
      logger.warn(
        `ignore non-string key in userscript header: "${key}"="${value}"`
      )
    }

    if (value !== null) {
      header[key] = value
    }
  }
  return header
}

interface PostBuildOption {
  entrypointPath: string
  releaseChannel: ReleaseChannel
  buildSuffix?: string
  headerOverride?: UserScriptHeader
}

async function postBuildScript(options: PostBuildOption): Promise<string> {
  const { entrypointPath, buildSuffix, headerOverride = {} } = options
  let packageJson: typeof PACKAGE_JSON
  try {
    packageJson = JSON.parse(await readFile("./package.json", "utf8"))
  } catch (error) {
    throw new Error("Failed to parse package.json", { cause: error })
  }

  const header: UserScriptHeader = {
    ...generateHeader(options.releaseChannel, packageJson),
    ...headerOverride,
  }

  if (buildSuffix) {
    header["@version"] += `.${buildSuffix}`
  }

  const longestHeaderChar = Math.max(...Object.keys(header).map(k => k.length))

  const HEADER_BEGIN = "// ==UserScript==\n"
  const HEADER_END = "// ==/UserScript==\n\n"

  const distUserScript = `${packageJson.name}.user.js`
  const outputPath = `${path.dirname(entrypointPath)}/${distUserScript}`
  const data = await readFile(entrypointPath, "utf8")
  // Check the existence of GM apis in data and check if they are added in header["@grant"]
  const grants = Array.isArray(header["@grant"])
    ? (header["@grant"] as string[])
    : []

  const usedApis = data.match(allGMApisMatcher)
  for (const api of usedApis ?? []) {
    if (!grants.includes(api)) {
      logger.error(
        `Used "${api}" api without permissions. Include it in package.json/userscriptHeader/@grant`
      )
    }
  }
  for (const api of grants) {
    if (!usedApis?.includes(api)) {
      logger.warn(`Granted permission for "${api}" but never used`)
    }
  }
  let output = HEADER_BEGIN

  for (const key of MINIMAL_USER_SCRIPT_HEADER_ITEMS) {
    const value = header[key]
    if (value === true) {
      output += `// ${key}\n`
    } else if (typeof value !== "boolean") {
      for (const row of typeof value === "string" ? [value] : value) {
        output += `// ${key.padEnd(longestHeaderChar)}  ${row}\n`
      }
    }
  }

  for (const key in header) {
    if (
      MINIMAL_USER_SCRIPT_HEADER_SET.has(
        key as (typeof MINIMAL_USER_SCRIPT_HEADER_ITEMS)[number]
      )
    ) {
      continue
    }
    const value = header[key]

    if (value === true) {
      output += `// ${key}\n`
    } else if (typeof value !== "boolean") {
      for (const row of typeof value === "string" ? [value] : value) {
        output += `// ${key.padEnd(longestHeaderChar)}  ${row}\n`
      }
    }
  }
  output += HEADER_END
  output += data

  await writeFile(outputPath, output)
  logger.info(`Successfully added the header to the userscript ${outputPath}!`)
  return outputPath
}

interface BuildOption {
  dev?: boolean
  releaseChannel?: ReleaseChannel
}

interface BuildOutput {
  readonly userscriptPath: string
}

async function runBuilderFn(option: BuildOption): Promise<BuildOutput> {
  const { dev = false, releaseChannel = "GitCommit" } = option
  const entrypoint = "./src/index.ts"
  const entrypointPath = "./dist/index.js"

  try {
    // Check if entrypoint has exports
    const indexContent = await readFile(entrypoint, "utf8")
    const hasExports = /^export\s+/m.test(indexContent)

    if (hasExports) {
      throw new Error(
        `${entrypoint
          .split("/")
          .at(
            -1
          )} should not contain exports. Move exports to a separate file (e.g. config.ts).`
      )
    }

    logger.info(`Building ${entrypoint}`)

    const build = await esbuild.build({
      entryPoints: [entrypoint],
      outfile: entrypointPath,
      bundle: true,
      minify: false,
      sourcemap: dev ? "external" : false,
      loader: {
        ".html": "text",
      },
      plugins: [cssTextPlugin],
      platform: "browser",
      format: "esm",
      define: {
        __DEV__: JSON.stringify(dev),
      },
      logLevel: "silent",
    })
    logger.info(inspect(build, { colors: true }))

    for (const warning of build.warnings) {
      logger.warn(warning.text)
    }

    logger.info(`Running post build script with entrypoint ${entrypointPath}.`)

    const outputPath = await postBuildScript({
      entrypointPath,
      releaseChannel,
      buildSuffix: dev ? Date.now().toString() : undefined,
    })
    return {
      userscriptPath: outputPath,
    }
  } catch (error) {
    if (error instanceof AggregateError) {
      logger.error(inspect(error, { colors: true }))
    } else if (error instanceof Error) {
      logger.error(error.message)
    } else {
      logger.error(JSON.stringify(error))
    }
    throw error
  }
}

interface Watcher {
  close: () => void
}

function watch(option: BuildOption): Watcher {
  let stopped: boolean = false
  const listener: WatchListener<string> = (event, filename) => {
    if (stopped) return
    logger.info(`Detected ${event} in ${filename}`)
    runBuilderFn(option)
  }
  const watchPaths = [
    `${import.meta.dirname}/src`,
    `${import.meta.dirname}/package.json`,
  ]
  const watchers = watchPaths.map(path =>
    fswatch(path, { recursive: true }, listener)
  )
  logger.info(`Watching paths ${watchPaths.join(", ")}`)
  return {
    close: () => {
      logger.info("Closing watcher...")
      stopped = true
      watchers.forEach(watcher => {
        watcher.close()
      })
    },
  }
}

interface ServerOption {
  userscriptPath: string
}

interface Server {
  close: () => void
}

function serve(option: ServerOption): Server {
  const { userscriptPath } = option
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
    logger.info("Listening on http://localhost:3000/")
  })
  return {
    close: () => {
      logger.info("Stopping dev server...")
      server.close()
      server.unref()
    },
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("dev", {
      type: "boolean",
      description:
        "Build in development mode, which disables minify and enables inline source map",
      default: false,
    })
    .option("server", {
      type: "boolean",
      description: "Start a local HTTP server for the generated user script",
      default: false,
    })
    .option("watch", {
      type: "boolean",
      description:
        "Watch src folder and build whenever change happens to its files",
      default: false,
    })
    .option("release-channel", {
      type: "string",
      choices: VALID_RELEASE_CHANNELS,
      default: "GitCommit",
    })
    .parse()

  const option: BuildOption = {
    dev: argv.dev,
    releaseChannel: argv.releaseChannel as ReleaseChannel,
  }

  // initial building is always needed, even for watching build
  const { userscriptPath } = await runBuilderFn(option)

  if (argv.server) {
    const s = serve({ userscriptPath })
    process.on("SIGINT", () => {
      s.close()
    })
  }

  if (argv.watch) {
    const w = watch(option)
    process.on("SIGINT", () => {
      w.close()
    })
  }
}

await main()
