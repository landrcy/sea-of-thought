# Sea of Thought

One full-screen pixel ocean. The only visible text is the pixel-cursive title; the only UI is a pixel-art "write a bottle" icon in the top-right corner and a small "delete a bottle" control in the top-left (it sends a bottle for review; nothing is deleted instantly). The whole page is water: scrolling is a dive from the surface and its waves, through the sunlit shallows and midwater, into the deep and down to the abyss and seabed. Every message in a bottle floats somewhere on that dive. Click (or Tab to) a bottle to unroll its scroll.

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
index.html           canvas ocean + scroll spacer, sr-only <h1>, top-right icon button, top-left delete control, three pixel-scroll dialogs, toast
assets/style.css     pixel UI: icon buttons, [data-tip] tooltips, scroll/parchment dialogs, cursors, scrollbars
assets/scene.js      shared pixel helpers (dithered gradients, sprites), sky kit, the single rAF ticker
assets/seabed.js     procedural seabed art: big shipwreck, open treasure chest, 5 coral species (staghorn, brain, fan, tube, table) with glow tips,
                     temple ruins, statue, stone steps, lighthouse ruin, pier posts, giant clam, whale ribs, hydrothermal vents, rock spires
assets/filter.js     profanity / slur / sexual / threat filter (SOT.filter; also `require`-able in Node)
assets/ocean.js      the dive: eased camera, depth gradient, surface/waves/foam, light shafts, caustics, marine snow,
                     bubbles, schools/turtle/tuna/jellies/rays/whale/anglerfish, kelp forest, coral reef, wreck + chest;
                     bottle layout, drift, tilt, sinking, splash-in
assets/bottles.js    9 bottle shapes x glass tints x seals (cork / wax / lid), scroll visible inside, rocks on twine
assets/life.js       sprites for fish, turtle, whale, anglerfish, starfish, wreck, treasure chest; jellyfish + manta
assets/icons.js      pixel icons (close, arrows, wax seal, rocks, quill + inkwell), parchment rolls, paper texture
assets/workshop.js   write animation (scroll written -> rolled -> bottled -> corked -> rocks tied -> thrown -> splash -> sink)
assets/store.js      SEA_API storage adapter (shared store + localStorage fallback; validates rocks 0-3) + the review-queue (reports) adapter
assets/app.js        wiring: bottles, dialogs, write form, rocks control, rate limit, pick mode, report dialog
assets/title.png     pixel-cursive title (desktop)       assets/title-m.png   two-line title (<=640px)
assets/cursor-pick.png  crosshair for pick mode
assets/cursor.png    pixel arrow cursor                  assets/cursor-hand.png  pixel hand cursor
assets/favicon.svg   favicon                             assets/og.png        1200x630 social preview
tests/filter.test.js  Node test for the filter
assets/fonts/        VT323 (UI text) + OFL licenses for VT323 and Pacifico (the title lettering was rendered from it)
```

## Design notes

- Palette: "Ocean Blue Serenity" (#03045E #023E8A #0077B6 #0096C7 #00B4D8 #48CAE4 #90E0EF #ADE8F4 #CAF0F8) graded by depth: light end in the shallows, middle in midwater, #023E8A -> #03045E in the deep. Foam and highlights are white. There are no sunset tones; only small natural accents (cork, parchment, fish, coral).
- Depth and life: surface + waves -> sunlit shallows (small-fish schools, turtle) -> midwater (bigger fish, jellyfish, manta rays) -> deep (whale silhouette, anglerfish lures, lantern fish) -> seabed (a large shipwreck, an open treasure chest with a soft glow, glowing coral reef, sunken temple ruins, statue, lighthouse ruin, pier posts, giant clam, whale ribs, hydrothermal vents, kelp forest, starfish). Layers use parallax; caustics and light shafts fade with depth; marine snow and bioluminescent specks increase with depth.
- Page height is 6-10 viewports (6 + 1 per 30 bottles, capped at 10, extended if needed so rows never overlap).
- Bottles: shape / tint / seal are chosen deterministically from the bottle number. The newest bottles float on the surface; older ones sit deeper by age rank. Each rock (0-3) makes a bottle sink about a quarter of a screen deeper. Bottles ease toward their depth, tilt with wave slope and their drift/sink velocity, and a new bottle falls in with a splash. Every bottle is a real `<button>` (keyboard-focusable, aria-label); focusing one scrolls it into view; `#N` chips show on hover/focus only. In an open bottle, the arrow buttons (or Left/Right keys) step to the older/newer bottle. Esc closes dialogs.
- Rocks: in the write scroll the pixel rock control cycles 0-3 rocks, which hang from the bottle on twine in the animation. The value is stored with each bottle as an integer `rocks` (0-3). Older records without it read as 0.
- Safety: all message text is rendered with `textContent`; 280-char limit (name 24); one bottle per 30 s per browser; 1000-bottle cap; merge-on-write; no example or seed bottles exist (an empty sea stays empty; the first bottle becomes #1).
- Performance: the scene is a tiny canvas (3-5 CSS px per art pixel) so DPR is inherently capped; only the visible depth range is drawn; the ticker pauses when the tab is hidden; `prefers-reduced-motion` disables motion.
- Times show in America/New_York.
- Fonts: title lettering rendered from Pacifico (SIL OFL 1.1); UI text is VT323 (SIL OFL 1.1), shipped in `assets/fonts/`.

## Shared storage

Bottles are shared across visitors through a free keyless CORS store (textdb.dev) behind the `SOT.createSeaApi` adapter in `assets/store.js`. The bucket URL is `SEA_DEFAULTS.url`. To use your own bucket, change that one URL (pick a long random name). Any HTTP key-value store with GET and POST works if you adapt the two calls in the adapter. If the store is unreachable, the adapter falls back to localStorage (`sot:bottles:v1`), so the site still works, but only for that browser. A record looks like `{id, n, ts, name, msg, rocks}`. `list()` only reads; it never creates bottles.

## Review queue ("delete a bottle")

The top-left control enters pick mode (click a bottle, or focus one and press Enter; Esc cancels). The dialog shows the bottle number (editable), an optional "why?" (max 140) and a **send for review** button. A report does **not** delete or hide anything: the bottles bucket is never modified by a report and the bottle stays visible. **Deletion is manual and only ever done by the owner**, by editing the bottles bucket yourself.

Reports go to a separate keyless textdb bucket, written with the same merge-on-write + read-back verify as `store.js` (`SOT.createReportsApi`, `REPORT_DEFAULTS.url`):

```
https://textdb.dev/api/data/sea-of-thought-reports-20569297366a
```

Body is JSON `{"v":1,"reports":[ ... ]}`, append-only, newest last, capped at 500 records. Each record:

```
{ "id": "…", "bottleId": "…", "n": 12, "ts": 1792780435179, "reason": "≤140 chars, may be empty",
  "bottleName": "≤24", "bottleMsg": "≤280", "bottleTs": 1792646865365, "status": "pending" }
```

All fields are type-checked and length-clamped before send and again on read; they are plain text (the page only ever uses `textContent`). Limits: one report per bottle per hour per browser (localStorage `sot:reported`) and one report every 20 s per browser. To triage: read the URL above in a browser or `curl`, remove records you have dealt with (or set `status`), and delete the bottle yourself if warranted. To reset the queue, POST `{"v":1,"reports":[]}` (Content-Type text/plain) to the URL. To use your own bucket, change `REPORT_DEFAULTS.url`.

The bottle snapshot (`bottleName`/`bottleMsg`) is stored unfiltered because it is the evidence being reviewed. The "why?" text and the typed bottle number pass through `assets/filter.js`: bad words are replaced with `***` as you move on from the word, sending is blocked while any `***` remains, a pixel "Please keep it kind" notice appears, and the adapter re-checks right before sending, so profanity is never sent or stored. The filter is deliberately **not** applied to bottle messages in the write form. Node test: `node tests/filter.test.js` (positives, obfuscated positives, innocent words); `require('./assets/filter.js')` works in Node.

## Dev query parameters

`?demo=N` N fake bottles in memory (some with rocks; not labelled; nothing saved or sent; reports stay local too) · `?local` force localStorage · `?sky=night|day` (night is a developer preview; there is no toggle) · `?write` open the write scroll (`?write=2` pre-fills text and 2 rocks) · `?anim=<sec>` freeze the write animation at that time (`&rocks=2&bn=9`) · `?scroll=<px>` start scrolled · `#bottle-N` open bottle N · `?pick` start in pick mode · `?report=N&why=text` open the report dialog for bottle N · `?reportsurl=<textdb url>` point reports at a throwaway bucket (https://textdb.dev/api/data/… only).

## Deploy as its own site (e.g. GitHub Pages)

1. Create a new empty repo (e.g. `sea-of-thought`) on your account or org.
2. Copy the contents of this folder (`index.html`, `README.md`, `assets/`) into the repo root, then commit and push to `main`.
3. In the repo go to Settings → Pages → Build and deployment → Source: "Deploy from a branch", Branch: `main` / `(root)`, and save.
4. Your site goes live at `https://<user>.github.io/sea-of-thought/` (or on your custom domain). Netlify, Cloudflare Pages or any static host also work. Just upload the folder.
5. Social preview: `index.html` sets `og:image` and `twitter:image` to the absolute URL `https://landrcy.github.io/sea-of-thought/assets/og.png`. If you host elsewhere, change those two URLs to your own `…/assets/og.png`.
