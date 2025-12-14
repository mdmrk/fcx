import { ConfigSection, type ConfigDefinition } from "@/types/config"

export const CONFIG_KEYS = {
	REMOVE_SIDEBAR: "remove_sidebar",
	INFINITE_SCROLL: "infinite_scroll",
}

export const configs: ConfigDefinition[] = [
	{
		key: CONFIG_KEYS.REMOVE_SIDEBAR,
		section: ConfigSection.NEW_INTERFACE,
		label: "Eliminar Barra Lateral",
		description:
			"Elimina la barra lateral derecha y expande el área de contenido principal.",
		defaultValue: true,
		type: "checkbox",
	},
	{
		key: CONFIG_KEYS.INFINITE_SCROLL,
		section: ConfigSection.COMMON,
		label: "Scroll Infinito",
		description:
			"Carga automáticamente la siguiente página de hilos al llegar al final.",
		defaultValue: true,
		type: "checkbox",
	},
]
