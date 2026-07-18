import type { ConfigDefinition } from "@/types/config"

export const CONFIG_KEYS = {
  REMOVE_SIDEBAR: "remove_sidebar",
  INFINITE_SCROLL: "infinite_scroll",
  AUTO_UPDATE: "auto_update",
  REMOVE_BANNERS: "remove_banners",
  MAX_EAGER_PAGES: "max_eager_pages",
  COMPACT_THREADS: "compact_threads",
}

export const configs: ConfigDefinition[] = [
  {
    key: CONFIG_KEYS.REMOVE_SIDEBAR,
    label: "Eliminar Barra Lateral",
    description:
      "Elimina la barra lateral derecha y expande el área de contenido principal.",
    defaultValue: false,
    type: "checkbox",
    scopes: ["new"],
  },
  {
    key: CONFIG_KEYS.INFINITE_SCROLL,
    label: "Cargar hilo completo",
    description:
      "Carga el hilo entero al entrar (hasta 50 páginas); en hilos más largos carga las páginas automáticamente al hacer scroll.",
    defaultValue: true,
    type: "checkbox",
  },
  {
    key: CONFIG_KEYS.AUTO_UPDATE,
    label: "Actualización automática",
    description:
      "Al llegar al final del hilo, comprueba periódicamente si hay posts nuevos y los añade sin recargar.",
    defaultValue: true,
    type: "checkbox",
  },
  {
    key: CONFIG_KEYS.MAX_EAGER_PAGES,
    label: "Máx. páginas al cargar de golpe",
    description:
      "Al abrir un hilo, número máximo de páginas que se cargan de una vez; los hilos más largos siguen cargando al hacer scroll.",
    defaultValue: 50,
    type: "number",
    min: 1,
    max: 500,
  },
  {
    key: CONFIG_KEYS.REMOVE_BANNERS,
    label: "Eliminar Publicidad",
    description: "Oculta los banners de publicidad.",
    defaultValue: true,
    type: "checkbox",
  },
  {
    key: CONFIG_KEYS.COMPACT_THREADS,
    label: "Vista compacta",
    description:
      "Reduce el espaciado entre mensajes para mostrar más contenido en pantalla.",
    defaultValue: true,
    type: "checkbox",
    scopes: ["new"],
  },
]
