# FCX — notas de desarrollo

Userscript que mejora la navegación en ForoCoches. TypeScript + esbuild (`build.ts`),
pnpm, Biome (lint + format). Sin tests: la verificación es lint + `tsc` + build, y
para cambios visuales, inspección real por CDP (ver abajo).

## Comandos

```bash
pnpm dev              # build dev + watch + servidor en http://localhost:3000/
pnpm dev:hot          # navegador dev + watch + recarga/reinyección por CDP
pnpm build            # build de release -> dist/fcx.user.js
pnpm build:watch      # solo watch, sin servidor
pnpm build:greasyfork # biome lint && tsc --noEmit && build  (lo que corre CI)
pnpm lint / format
```

`__DEV__` es una constante inyectada por esbuild (`build.ts`), no una variable que se
edite a mano. `logger.*` solo escribe si `__DEV__`. (`CONTRIBUTION.md` está desfasado
en este punto: habla de un `devMode` editable.)

## Arquitectura

- `src/index.ts` — detecta interfaz, elige adapter, `init()` + `setupFeatures()`.
- `src/adapters/{new,old}-adapter.ts` — patrón adapter por interfaz. Interfaz nueva
  se detecta con `#fc-desktop-version-tag-for-monitoring`.
- `src/config.ts` — selectores centralizados por interfaz. Añade selectores aquí, no
  incrustados en la lógica.
- `src/config-registry.ts` — definición declarativa de opciones; el panel de config se
  genera a partir de ella.
- `src/utils/storage.ts` — `getEffectiveConfig(key, scope)`: el toggle "General" activa
  la feature en ambas interfaces; si está apagado, manda el toggle por interfaz.
- `src/lib/` — features (thread-loader, quotes, media, remove-banners).

`initQuotes()` e `initMedia()` **solo corren en modo compacto y en la interfaz nueva**
(vía `applyCompact()`). Sus estilos viven dentro del bloque compacto por eso.

### Carga incremental

`thread-loader.ts` inyecta páginas enteras, en paralelo y **desordenadas** (hacia
adelante y hacia atrás). Cualquier cosa que indexe posts debe construirse de forma
incremental y ser idempotente: un post puede ser citado antes de existir en el DOM.
Ver el índice inverso de `quotes.ts` (`backlinks`) como referencia — se registra
siempre y se renderiza cuando el objetivo aparece.

## Trabajar con el DOM de ForoCoches

### La regla que más tiempo cuesta: los estilos inline

FC declara **muchísimo estilo inline**. Un estilo inline gana siempre a una hoja de
estilos salvo que la declaración lleve `!important`. En la práctica:

> **Cualquier propiedad que FC declare inline necesita `!important` para sobrescribirse.**

Esto ha causado bugs silenciosos reales (reglas que parecen correctas y no se aplican
nunca): `align-items: baseline` perdiendo contra un `align-items: flex-end` inline;
`display: none` perdiendo contra `display: flex` inline. Si una regla "no hace nada",
lo primero que hay que mirar es si el elemento trae esa propiedad inline.

### Mapa de un post (interfaz nueva)

```html
<section>
  <div id="post<ID>" class="postbit_wrapper">        <!-- #post<ID> ES el postbit_wrapper -->
    <div>                                            <!-- fila cabecera: > div:first-child -->
      <div>  <a><img class="thread-profile-image"></a>
             <div><div id="postmenu_<ID>"><a>usuario</a></div>
                  <div class="subtitle-small-gray">…</div></div></div>   <!-- izq: avatar+nombre -->
      <div>  fecha + #N </div>                       <!-- dcha -->
    </div>
    <separator></separator>
    <div id="post_message_<ID>">…</div>              <!-- cuerpo -->
    <div>                                            <!-- wrapper acciones -->
      <separator></separator>
      <div style="…justify-content: space-around…">  <!-- barra citar/responder -->
    </div>
  </div>
</section>
```

- `#post<ID>` **es** el `.postbit_wrapper`, no un ancla aparte.
- La barra de acciones se identifica por `div[style*="justify-content: space-around"]`.
  Su wrapper (`div:has(> …)`) incluye además un `<separator>`; ocultar el wrapper se
  lleva ambos.
- **Hay ~7 `<separator>` por sección.** Nunca los ocultes por tipo; usa `:has()` para
  apuntar al contenedor concreto.
- Citas: `.squote`, con `:scope > .quote a[href]` apuntando a `#post<n>` o `?p=<n>`, y
  el autor citado en `.quote b`.

Estilos inline verificados en 30/30 posts (útiles porque hay que neutralizarlos al
pasar el layout apilado a fila en compacto): la fila de cabecera **no** declara
`align-items` (queda en `stretch`); grupo izquierdo `align-items: center`; grupo
derecho `align-items: flex-end`; el div de fecha `margin-bottom: 4px`; el subtítulo
`margin-top: 4px`.

### Scope del CSS compacto

El bloque compacto está scopeado así:

```css
html.fcx-compact :is(#posts, #fcx-quote-preview)
```

El preview flotante cuelga de `<body>`, **fuera de `#posts`**. Si no se lista
explícitamente, el post clonado dentro del preview se renderiza con el formato por
defecto de FC. Cualquier contenedor nuevo que deba parecerse a un post hay que
añadirlo a ese `:is()`.

Ojo al ampliar ese scope: reglas que antes matcheaban subárboles disjuntos pasan a
competir por el mismo elemento, y `noDescendingSpecificity` de Biome deja de ser
falso positivo. Preferible igualar especificidad a suprimir el aviso.

## Inspeccionar y verificar el DOM

**Trampa importante:** un `curl` anónimo sirve para la estructura general (devuelve la
interfaz nueva con ~30 posts), pero **la barra de acciones (citar/responder) solo se
renderiza para usuarios logueados** y no aparece ahí. Asumir que un selector vale
mirando solo el HTML anónimo lleva a error.

La vía fiable es el navegador dev por CDP:

```bash
./scripts/dev-browser.sh [url]        # Helium con remote debugging, perfil .helium-dev
node scripts/cdp.mjs tabs             # listar pestañas
node scripts/cdp.mjs eval '<js>'      # ejecutar JS en la pestaña
node scripts/cdp.mjs sel '<css>'      # inspeccionar por selector
node scripts/cdp.mjs inject           # inyectar dist/fcx.user.js en la pestaña
node scripts/cdp.mjs watch            # recarga + reinyección en cada rebuild
```

Puerto 9222 (`CDP_PORT`), binario en `/opt/helium-browser-bin/helium` (`HELIUM_BIN`).
Perfil dedicado en `.helium-dev/` — Chromium no permite remote debugging en el perfil
por defecto; hay que loguearse en FC una vez ahí y la sesión persiste.

Para cambios de CSS, **comprueba `getComputedStyle` por CDP en vez de razonar sobre la
cascada**. Con los estilos inline de FC de por medio, el razonamiento falla. Y compara
siempre el elemento en el preview contra el mismo elemento en el feed, para detectar
daños colaterales.

## Release

`.github/workflows/release.yml` dispara con `push: tags: ['v*']` y publica
`dist/fcx.user.js` en una GitHub Release. `ci.yml` corre lint/format en `main` y PRs.

Dos cosas que confunden:

1. **Ambos workflows se llaman `name: ci`**, así que la ejecución de release aparece
   etiquetada como "ci" en la pestaña Actions y parece que no ha corrido.
2. **Empujar rama y tag en el mismo `git push` puede tragarse el evento del tag** y el
   release no se dispara. Empuja el tag como push independiente:

```bash
git push origin main
git push origin v0.3.1     # push aparte
```

Si el tag ya está en remoto sin haber disparado nada, hay que recrear el evento:
`git push origin :refs/tags/vX.Y.Z` y volver a empujarlo.

La versión vive solo en `package.json`; el workflow la lee de ahí. Convención de tag:
`vX.Y.Z`, y el commit de release se titula igual (`v0.3.1`).

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
