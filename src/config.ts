export const devMode = __DEV__

export const oldSelectors = {
  feedContainer: "#posts",
  nextPageLink: "a[rel='next']",
  prevPageLink: "a[rel='prev']",
  activePage: "td.alt2 .mfont strong",
}

export const newSelectors = {
  feedContainer: "#posts",
  nextPageLink: "a:has(span[style*='--next-right-icon'])",
  prevPageLink: "a:has(span[style*='--next-left-icon'])",
  activePage: "span[title*='Mostrando resultados'] > strong",
}
