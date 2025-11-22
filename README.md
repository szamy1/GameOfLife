# Game of Life Studio

A modern, themeable take on Conway’s Game of Life with presets, wrap control, speed/density sliders, responsive canvas, and persistent state.

## Quick start

```bash
npm install
npm run dev
# open the dev server URL shown in the terminal
```

## Scripts
- `npm run dev` – start Vite dev server with HMR
- `npm run build` – type-check and build for production
- `npm run preview` – serve the production build locally

## Deploy (static hosting)
- Output is pure static files in `dist/`; host on GitHub Pages, Cloudflare Pages, Netlify, etc.
- If you need a non-root base path (e.g., GitHub Pages project site), set `BASE_PATH=/your-repo/` before building, or edit `vite.config.ts`.
  ```bash
  BASE_PATH=/your-repo/ npm run build
  ```
- Cloudflare Pages: select the repo, set build command to `npm run build` and output directory to `dist/`.
- GitHub Pages: create a workflow that runs `npm ci`, `npm run build`, and publishes `dist` with `actions/upload-pages-artifact` + `actions/deploy-pages`.

## Features implemented
- Canvas renderer with pointer painting (desktop + mobile), play/pause, step, clear, randomize, and adjustable speed.
- User-resizable grid (independent width/height), wrap/nowrap toggle, and adjustable random fill density.
- Pattern presets: Glider, Small Exploder, Pulsar, and Gosper Glider Gun (auto-centered).
- Multiple themes (Light Quartz, Midnight, Neon Grid, Solar Dawn) with CSS variable tokens for easy expansion.
- Persistent state in `localStorage` (board, theme, speed, wrap, size) ready for shareable URLs or custom rules later.
- Rules panel describing B3/S23 and interaction tips.
