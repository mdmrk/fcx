export interface SelectorConfig {
	feedContainer: string
	commentItem: string
	avatar: string
	authorName: string
	content: string
	nextPageLink: string
}

export interface SiteAdapter {
	name: string
	selectors: SelectorConfig
	init(): void
	setupFeatures(): void
}
