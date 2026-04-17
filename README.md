# Argus Vision Demo

Single-page web UI demonstrating [argus-lens](https://github.com/smk762/argus-lens) structured image captioning. Paste an image URL, configure pipeline parameters, and inspect training-optimised caption variants, raw model outputs, and auto-removed tag analysis.

Designed as a living onboarding document — every parameter includes an inline explanation of what it does and why.

## Quick Start

Start the `argus-lens` server first (in a separate terminal):

```bash
# In the argus-lens repo
pip install argus-lens[server,local]
argus-lens serve --cors --port 8000
```

Then launch the demo frontend:

```bash
# Docker (recommended)
cp .env.example .env
docker compose up --build
```

```bash
# Or local dev
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
browser (:3000)  →  Next.js frontend
                         ↓ POST /caption/url
                    argus-lens server (:8000)
                         ↓ ArgusLens.caption(url)
                    captioning pipeline
```

The demo is a thin frontend-only wrapper. It sends JSON requests to the `argus-lens` HTTP server and renders structured results. No backend code lives in this repo.

- **Frontend** — Next.js 15 (App Router) + Tailwind CSS v4, dark theme
- **Server** — provided by `argus-lens[server]` (see [argus-lens](https://github.com/smk762/argus-lens))

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL the browser uses to reach the argus-lens API |
| `FRONTEND_PORT` | `3000` | Host port for the Next.js frontend (Docker only) |

## Parameters

All captioning parameters are exposed in the UI with inline documentation:

| Parameter | Default | Description |
|---|---|---|
| `trigger_word` | *(empty)* | Unique token prepended to training captions for identity association |
| `target_style` | `photo` | `photo` for realism models, `anime` for booru-tagged models |
| `target_backend` | `sdxl` | Diffusion backend — determines CLIP/T5 token budget (60–200 tokens) |
| `target_category` | `identity` | Which category variant becomes `final_caption` |
| `prose_enrichment` | `true` | Append novel prose-derived tokens to training variant at lowest priority |

## Related

- [argus-lens](https://github.com/smk762/argus-lens) -- the captioning engine, CLI, and server that powers this demo

## License

MIT
