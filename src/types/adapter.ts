export interface SelectorConfig {
  feedContainer: string
  resultsInfo?: string
}

export interface SiteAdapter {
  name: string
  selectors: SelectorConfig
  init(): void
  setupFeatures(): void
}
