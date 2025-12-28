import { devMode } from "@/config"

export const logger = {
  log: (...args: unknown[]) => {
    if (devMode) console.log(...args)
  },
  warn: (...args: unknown[]) => {
    if (devMode) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (devMode) console.error(...args)
  },
  info: (...args: unknown[]) => {
    if (devMode) console.info(...args)
  },
}
