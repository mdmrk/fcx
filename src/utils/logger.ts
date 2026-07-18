export const logger = {
  log: (...args: unknown[]) => {
    if (__DEV__) console.log("[FCX]", ...args)
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn("[FCX]", ...args)
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error("[FCX]", ...args)
  },
}
