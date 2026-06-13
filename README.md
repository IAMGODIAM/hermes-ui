# hermes-ui

A zero-framework chat interface for **Hermie** (the Visionary intelligence layer). Renders a precision chat UI on canvas using `@chenglou/pretext` text measurement — no React/Vue/Svelte.

## Stack
TypeScript · Vite · single runtime dependency (`@chenglou/pretext`). Modules: `renderer.ts` (canvas/DOM), `api.ts` (gateway client), `state.ts`, `pretext-engine.ts`, `theme.ts`.

## Connect
Talks to a Hermes gateway (default `http://localhost:8642`). Set the gateway URL — and an optional API key if the gateway requires `API_SERVER_KEY` — in the in-app Settings dialog (persisted to `localStorage`). Health pings every 10s.

## Run
```bash
npm install
npm run dev
npm run build   # tsc && vite build
```

## Status
Active, real implementation. Dark theme (#0a0a0c) with gold accent — aligns with the IAMGODIAM design system.
