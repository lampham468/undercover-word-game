# Undercover Word Game

A minimalist multiplayer social-deduction game (in the spirit of *Undercover/Spyfall*) with a Cloudflare Workers backend and a React + Vite frontend.

> **Note:** This entire codebase was written **100% by AI**.

---

## Features

- **Single active room**: one game at a time, up to 8 players  
- **Lobby flow**: host claims room, others join; start when ≥ 3 players  
- **Hidden roles**: everyone gets a secret word except the impostor  
- **Play loop**: give short clues, discuss, vote; players decide the winner  
- **Reliable transport**: WebSocket with auto-reconnect and exponential backoff  
- **Clean architecture**: modular services on the frontend; single-phase state machine on the backend

## Getting Started (Local)

### Prerequisites
- Node.js 20+
- npm

### Install
    npm ci

### Run both apps (dev)
    npm run dev
- Backend: http://localhost:8787  
- Frontend: http://localhost:5173/undercover-word-game/

> The frontend defaults to `ws://localhost:8787/ws` in dev.

---

## Configuration

### Production WebSocket URL
Create/commit `web/.env.production`:

    VITE_WS_URL=wss://undercover-backend.<your-subdomain>.workers.dev/ws

- `VITE_` variables are embedded into the client at build time (not secret).  
- Ensure it’s **wss://** and ends with **/ws**.

---

## Build

### Frontend
    npm run build:web

### Backend (from local dev machine)
    npm --workspace backend run deploy

---

## Deployment

### Backend (Cloudflare Workers)
- Uses Durable Objects with **SQLite storage**.
- `wrangler.toml` includes:

    [[migrations]]
    tag = "v1"
    new_sqlite_classes = ["RoomDO"]

- Action: `.github/workflows/backend-deploy.yml`  
  Requires GitHub secrets:
  - `CLOUDFLARE_API_TOKEN` (User API token with **Workers:Edit** on your account)
  - `CLOUDFLARE_ACCOUNT_ID`

### Frontend (GitHub Pages)
- Action: `.github/workflows/web-deploy.yml`
- Builds the `web` project, uploads the artifact, and deploys to Pages
- Remember to set `VITE_WS_URL` in `web/.env.production` before building

---

## Architecture Overview

- **Backend**
  - Cloudflare Worker fronts a **Durable Object** (`RoomDO`)
  - Single authoritative `Phase` (`Idle | Lobby | InGame`) drives state
  - Unified `leaveOrClose` handles explicit leaves and socket drops
  - Only active, non-Idle players with open sockets count toward capacity

- **Frontend**
  - `session.ts`: session identity (stable across tabs in production)
  - `ws.ts`: WebSocket client with reconnection (250ms → 4s backoff)
  - `roomClient.ts`: protocol layer, emits `{ state, error, status }` events
  - `useRoom.ts`: React hook exposing `{ state, svc, status, error }`

---

## Scripts (root)

- `npm run dev` — run frontend + backend concurrently  
- `npm run build:web` — build frontend  
- `npm run deploy:backend` — deploy Cloudflare Worker (via wrangler)

---

## Notes & Limits

- One game/room active at a time by design
- Players decide winners by discussion/vote (no server-side scoring)
- Public endpoint is intentionally visible in the frontend build

---

## Credits

- Inspired by party games like *Undercover*  
- Built with React, TypeScript, Vite, TailwindCSS, Cloudflare Workers  
- **All code in this repository was generated entirely by AI, specifically ChatGPT 5 and Claude Sonnet 4.**
