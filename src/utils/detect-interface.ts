export const isNewInterface = (): boolean => {
	return !!document.querySelector('meta[name="description"]')
}
