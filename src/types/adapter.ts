export interface SelectorConfig {
  feedContainer: string
  nextPageLink: string
  prevPageLink: string
  activePage?: string
}

export interface SiteAdapter {
  name: string
  selectors: SelectorConfig
  init(): void
  setupFeatures(): void
}
