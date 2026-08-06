# RepoRadar frontend

The RepoRadar web UI — a professional light-theme search interface built with **React + Vite + TypeScript + Tailwind CSS + shadcn/ui**.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin, CSS-first config)
- **shadcn/ui** components (`src/components/ui/` — Button, Card, Badge, Input, Separator)
- **lucide-react** icons

## Layout

```
web/
  src/
    App.tsx            — main app: hero, search, results
    components/ui/     — shadcn/ui components
    lib/api.ts         — typed API client for /api/*
    index.css          — Tailwind v4 + design tokens (light theme)
  dist/                — production build (gitignored)
```

## Dev

```bash
npm install
npm run dev        # vite dev server, proxies /api → localhost:8123
```

## Build

```bash
npm run build      # outputs to dist/, served by ../server.py
```

The Python server (`../server.py`) serves the built `dist/` at `/` and all `/api/*` endpoints. `../start.bat` builds the frontend automatically on first run.
