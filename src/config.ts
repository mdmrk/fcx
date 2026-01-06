export const devMode = __DEV__

export const theme = {
  enhancedCommentClass: "enhanced-comment",
}

export const oldSelectors = {
  feedContainer: "#posts",
  commentItem: "table[id^='post']",
  avatar: ".avatar",
  authorName: ".bigusername",
  content: "div[id^='post_message_']",
  nextPageLink: "a[rel='next']",
  prevPageLink: "a[rel='prev']",
}

export const newSelectors = {
  feedContainer: "#posts",
  commentItem: ".postbit_wrapper",
  avatar: ".thread-profile-image",
  authorName: "div[id^='postmenu_'] > a",
  content: "div[id^='post_message_']",
  nextPageLink: "a:has(span[style*='--next-right-icon'])",
  prevPageLink: "a:has(span[style*='--next-left-icon'])",
}
