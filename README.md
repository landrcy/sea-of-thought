# Sea of Thought

A standalone pixel-art website: a shared ocean where visitors write a message, seal it in a bottle and throw it into the sea.
Plain HTML/CSS/JS, no build step, no external dependencies (the Silkscreen pixel font is bundled in `assets/fonts`, SIL OFL).

## Run locally
```
cd /workspace/sea-of-thought-site && python3 -m http.server 8750
# open http://localhost:8750/
```
Opening `index.html` directly from disk also works (all paths are relative).

Dev-only query parameters: `?demo=30` (in-memory sample bottles, nothing saved or sent), `?local` (skip the shared store, use localStorage), `?sky=night` (night ocean; default is day), `#bottle-12` (opens that bottle).

## Files
- `index.html` – all sections: hero, The Sea, Write a Bottle, Older bottles, How it works, footer, modal
- `assets/style.css`, `assets/scene.js` (pixel scenes), `assets/workshop.js` (write animation), `assets/app.js` (UI), `assets/store.js` (storage adapter `SEA_API`)
- `assets/favicon.svg`, `assets/og.png`, `assets/fonts/`

## Shared storage
Bottles are one JSON blob in a free keyless CORS store (textdb.dev). The bucket URL is the `url` default in `assets/store.js`.
To use your own bucket, change that URL to `https://textdb.dev/api/data/<your-unique-name>`. If the store is unreachable the site falls back to localStorage.
Limits: one bottle per 30 s per browser, 280 chars, 24-char name, 1000 bottles (oldest dropped beyond that). Anyone with the URL can read/write the blob (keyless), and writes are read-merge-write, so a heavy simultaneous burst could rarely lose a bottle.

## Deploy as its own site (GitHub Pages example)
1. Create a NEW empty repo (e.g. `sea-of-thought`) on GitHub.
2. From this folder: `git init && git add . && git commit -m "Sea of Thought" && git branch -M main && git remote add origin git@github.com:<you>/sea-of-thought.git && git push -u origin main`
3. Repo Settings -> Pages -> Deploy from branch -> `main` / root. The site appears at `https://<you>.github.io/sea-of-thought/`.
4. Optional: make `og:image` in `index.html` an absolute URL (`https://<you>.github.io/sea-of-thought/assets/og.png`) so link previews work.
Any static host (Netlify, Cloudflare Pages, S3, nginx) works the same way: upload the folder as-is.
