export interface SelectorConfig {
  feedContainer: string
  // Element whose title/text carries the total post count, e.g.
  // "Mostrando resultados del 1 al 30 de 60" (new interface only).
  resultsInfo?: string
}

export interface SiteAdapter {
  name: string
  selectors: SelectorConfig
  init(): void
  setupFeatures(): void
}
