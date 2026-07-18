# monoamial.com

Personal site for Noam Borgnia — Master's student in mathematical physics.
Chalkboard/notebook aesthetic, built with [Astro](https://astro.build) +
[KaTeX](https://katex.org). Heavy LaTeX support throughout.

## Concept

A working chalkboard. Four pillars:

- **Research** — geometric probability & dynamical systems
- **Code & Simulation** — numerical experiments and visualizations
- **Writing** — expository notes and essays
- **Teaching** — courses and materials

The homepage hero is a live generative "phase field" (particles advected
along a vector field) drawn in chalk on the canvas — a nod to dynamical
systems. It respects `prefers-reduced-motion`.

## Develop

```bash
npm install        # first time only
npm run dev        # local dev server at http://localhost:4321
npm run build      # static build into ./dist
npm run preview    # preview the production build
```

> You need Node 18+ installed. On macOS the easiest route is
> [nvm](https://github.com/nvm-sh/nvm):
> `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`
> then `nvm install --lts`.

## Adding content

Everything is markdown/MDX under `src/content/`. Drop a new `.mdx` file into
the right folder and it appears automatically, sorted by date.

| Section  | Folder                   |
|----------|--------------------------|
| Research | `src/content/research/`  |
| Code     | `src/content/code/`      |
| Writing  | `src/content/writing/`   |
| Teaching | `src/content/teaching/`  |

Frontmatter fields (see `src/content.config.ts` for the full schema):

```yaml
---
title: "Your title"
description: "One-line summary shown on the card"
date: 2026-06-01
tags: ["ergodic-theory", "geometry"]
draft: false           # set true to hide
# research only:
status: "in progress"  # in progress | preprint | published | note
coauthors: ["A. Author"]
# code only:
stack: ["Python", "NumPy"]
repo: "https://github.com/..."
demo: "https://..."
# teaching only:
role: "Teaching Assistant"
term: "Spring 2026"
# any section can add:
pdf: "/path/to/file.pdf"
link: "https://..."
---
```

Write math with `$inline$` and `$$display$$` — it renders to KaTeX at build
time (no CDN, no client JS required). Code blocks get syntax highlighting
automatically. If you ever need math directly inside a `.astro` file (not
`.mdx`), use `<Math tex="..." display={true|false} />` from
`src/components/Math.astro` — same build-time renderer.

## Adding a simulation

Two patterns live in `src/components/sims/`, both wrapped in the same
`SimFrame` chrome (the pinned specimen card look):

**Live** — the simulation actually runs in the visitor's browser. See
`IsingSim.astro` for the full reference pattern (a real Metropolis Ising
model on canvas, temperature slider wired to the physics in real time).
Copy that file as your starting point:

1. Duplicate `IsingSim.astro` → `src/components/sims/YourSim.astro`.
2. Replace the physics in the `is:inline` script — it's scoped to its own
   instance via `document.currentScript.closest('.sim-frame')`, so you can
   drop more than one sim on a page without id collisions.
3. Reuse the shared control classes from `global.css`
   (`.sim-controls`, `.sim-btn`, `.sim-readout`, range-slider styling) so
   new sims look consistent for free.
4. Import and drop it into any `.mdx` entry:
   ```mdx
   import YourSim from '../../components/sims/YourSim.astro';

   <YourSim />
   ```

**Recorded** — for anything too heavy to run client-side (PDE solves,
large N-body runs, cluster jobs). Render it to `.mp4` in Python/Julia, drop
the file in `public/sims/`, and embed it with `RecordedSim.astro`:

```mdx
import RecordedSim from '../../components/sims/RecordedSim.astro';

<RecordedSim
  title="Vortex shedding, Re = 4000"
  video="/sims/vortex.mp4"
  poster="/sims/vortex-poster.jpg"
  dataHref="https://github.com/you/repo"
>
  One line of caption — what parameters, what to notice.
</RecordedSim>
```

Both variants get the same "running live" / "recorded" pin-badge, so a
reader always knows whether they're driving the physics or watching a
recording.

## Browsing everything at once

`/work/` aggregates all four collections into one filterable index (by
section and by tag) — useful once you have enough entries that the four
separate section pages aren't enough to browse by theme (e.g. "show me
everything tagged `phase-transitions`" across research, code, and teaching
at once).

## Customize

- **Colors / fonts / chalk textures:** `src/styles/global.css` (CSS variables at top).
- **Navigation, footer links, social:** `src/components/Nav.astro`, `src/components/Footer.astro`.
- **Homepage hero + pillars:** `src/pages/index.astro`.
- **The animated field:** `src/components/PhaseField.astro`.
- **Bio:** `src/pages/about/index.astro`.
- **Domain:** update `site:` in `astro.config.mjs` and the sitemap URL in `public/robots.txt`.

Drop your real `cv.pdf` into `public/` (the About page links to `/cv.pdf`).

## Deploy to Cloudflare Pages

Since your domain is on Cloudflare, **Cloudflare Pages** is the natural host.

1. Push this repo to GitHub (or GitLab).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Then **Custom domains** → add your `.com`. Because DNS is already on
   Cloudflare, it wires up automatically (no nameserver changes needed).

Alternatively, deploy straight from your machine without Git:

```bash
npm run build
npx wrangler pages deploy dist --project-name noamborgnia
```

Remember to set the real domain in `astro.config.mjs` (`site:`) before building
so the sitemap and canonical URLs are correct.
