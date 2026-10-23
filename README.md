# Sea of Thought

One full-screen pixel ocean. The only visible text is the pixel-cursive title; the only UI is a pixel-art "write a bottle" icon in the top-right corner. The whole page is water: scrolling is a dive from the surface and its waves, through the sunlit shallows and midwater, into the deep and down to the abyss and seabed. Every message in a bottle floats somewhere on that dive. Click (or Tab to) a bottle to unroll its scroll.

Plain HTML/CSS/JS, no build step, no dependencies, relative paths only.

## Run locally

```
cd sea-of-thought-site
python3 -m http.server 8750
# open http://localhost:8750/
```

(It also works opened directly from `file://`; the shared store needs network access either way and falls back to this browser's localStorage if unreachable.)

## Files

```
index.html           canvas ocean + scroll spacer, sr-only <h1>, top-right icon button, two pixel-scroll dialogs
assets/style.css     pixel UI: icon buttons, [data-tip] tooltips, scroll/parchment dialogs, cursors, scrollbars
assets/scene.js      shared pixel helpers (dithered gradients, sprites), sky kit, the single rAF ticker
assets/ocean.js      the dive: eased camera, depth gradient, surface/waves/foam, light shafts, caustics, marine snow,
                     bubbles, schools/turtle/tuna/jellies/rays/whale/anglerfish, kelp forest, coral reef, wreck + chest;
                     bottle layout, drift, tilt, sinking, splash-in
assets/bottles.js    9 bottle shapes x glass tints x seals (cork / wax / lid), scroll visible inside, rocks on twine
assets/life.js       sprites for fish, turtle, whale, anglerfish, starfish, wreck, treasure chest; jellyfish + manta
assets/icons.js      pixel icons (close, arrows, wax seal, rocks, quill + inkwell), parchment rolls, paper texture
assets/workshop.js   write animation (scroll written -> rolled -> bottled -> corked -> rocks tied -> thrown -> splash -> sink)
assets/store.js      SEA_API storage adapter (shared store + localStorage fallback; validates rocks 0-3)
assets/app.js        wiring: bottles, dialogs, write form, rocks control, rate limit
assets/title.png     pixel-cursive title (desktop)       assets/title-m.png   two-line title (<=640px)
assets/cursor.png    pixel arrow cursor                  assets/cursor-hand.png  pixel hand cursor
assets/favicon.svg   favicon                             assets/og.png        1200x630 social preview
assets/fonts/        VT323 (UI text) + OFL licenses for VT323 and Pacifico (the title lettering was rendered from it)
```

## Design notes

- Palette: "Ocean Blue Serenity" (#03045E #023E8A #0077B6 #0096C7 #00B4D8 #48CAE4 #90E0EF #ADE8F4 #CAF0F8) graded by depth: light end in the shallows, middle in midwater, #023E8A -> #03045E in the deep. Foam and highlights are white. There are no sunset tones; only small natural accents (cork, parchment, fish, coral).
- Depth and life: surface + waves -> sunlit shallows (small-fish schools, turtle) -> midwater (bigger fish, jellyfish, manta rays) -> deep (whale silhouette, anglerfish lures, lantern fish) -> seabed (shipwreck, treasure chest, coral reef, kelp forest, starfish). Layers use parallax; caustics and light shafts fade with depth; marine snow and bioluminescent specks increase with depth.
- Page height is 6-10 viewports (6 + 1 per 30 bottles, capped at 10, extended if needed so rows never overlap).
- Bottles: shape / tint / seal are chosen deterministically from the bottle number. The newest bottles float on the surface; older ones sit deeper by age rank. Each rock (0-3) makes a bottle sink about a quarter of a screen deeper. Bottles ease toward their depth, tilt with wave slope and their drift/sink velocity, and a new bottle falls in with a splash. Every bottle is a real `<button>` (keyboard-focusable, aria-label); focusing one scrolls it into view; `#N` chips show on hover/focus only. In an open bottle, the arrow buttons (or Left/Right keys) step to the older/newer bottle. Esc closes dialogs.
- Rocks: in the write scroll the pixel rock control cycles 0-3 rocks, which hang from the bottle on twine in the animation. The value is stored with each bottle as an integer `rocks` (0-3). Older records without it read as 0.
- Safety: all message text is rendered with `textContent`; 280-char limit (name 24); one bottle per 30 s per browser; 1000-bottle cap; merge-on-write; 3 clearly labelled example bottles are seeded only if the store is empty.
- Performance: the scene is a tiny canvas (3-5 CSS px per art pixel) so DPR is inherently capped; only the visible depth range is drawn; the ticker pauses when the tab is hidden; `prefers-reduced-motion` disables motion.
- Times show in America/New_York.
- Fonts: title lettering rendered from Pacifico (SIL OFL 1.1); UI text is VT323 (SIL OFL 1.1), shipped in `assets/fonts/`.

## Shared storage

Bottles are shared across visitors through a free keyless CORS store (textdb.dev) behind the `SOT.createSeaApi` adapter in `assets/store.js`. The bucket URL is `SEA_DEFAULTS.url`. To use your own bucket, change that one URL (pick a long random name). Any HTTP key-value store with GET and POST works if you adapt the two calls in the adapter. If the store is unreachable, the adapter falls back to localStorage (`sot:bottles:v1`), so the site still works, but only for that browser. A record looks like `{id, n, ts, name, msg, rocks, seed}`.

## Dev query parameters

`?demo=N` N fake bottles in memory (some with rocks; nothing saved or sent) · `?local` force localStorage · `?sky=night|day` (night is a developer preview; there is no toggle) · `?write` open the write scroll (`?write=2` pre-fills text and 2 rocks) · `?anim=<sec>` freeze the write animation at that time (`&rocks=2&bn=9`) · `?scroll=<px>` start scrolled · `#bottle-N` open bottle N.

## Deploy as its own site (e.g. GitHub Pages)

1. Create a new empty repo (e.g. `sea-of-thought`) on your account or org.
2. Copy the contents of this folder (`index.html`, `README.md`, `assets/`) into the repo root, then commit and push to `main`.
3. In the repo go to Settings → Pages → Build and deployment → Source: "Deploy from a branch", Branch: `main` / `(root)`, and save.
4. Your site goes live at `https://<user>.github.io/sea-of-thought/` (or on your custom domain). Netlify, Cloudflare Pages or any static host also work. Just upload the folder.
5. Social preview: `index.html` sets `og:image` and `twitter:image` to the absolute URL `https://landrcy.github.io/sea-of-thought/assets/og.png`. If you host elsewhere, change those two URLs to your own `…/assets/og.png`.
