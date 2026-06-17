# Card Game Backend

Node.js + Express + Socket.IO API for a multiplayer card game platform with wallets, payments, KYC, withdrawals, friends, chat, leaderboards, and admin operations.

Repository: `https://github.com/nikunjgoyani5/Card-Game-BackEnd.git`

For architecture, environment variables, business rules, integrations, and operational notes, see `TECHNICAL_HANDOVER.md`.

## Stack

- Node.js 22+, TypeScript, Express 4
- MongoDB (Mongoose), Redis (ioredis)
- Socket.IO for real-time gameplay and notifications
- Stripe for card deposits (PayPal/Google Pay placeholders in code)
- Swagger UI at `/api-docs`

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env with MONGO_URI, JWT_SECRET, STRIPE_*, and REDIS_URL
npm run dev
```

Default port: `5000` (`src/server.ts`, `.env.example`)

Health check:

```bash
curl http://localhost:5000/health
```

API base path: `/api/v1`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with nodemon + ts-node |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run lint` | ESLint on `.ts` files |

## Documentation

| Document | Purpose |
|----------|---------|
| `TECHNICAL_HANDOVER.md` | Project handover for developers |
| `docs/README.md` | Module-level API and Socket.IO reference |
| `docs/01-AUTH-MODULE.md` through `docs/11-SOCKET-IO-EVENTS.md` | Per-module API docs |
| `postman_collection.json` | Postman collection |
| `/api-docs` | Swagger UI (when server is running) |

## Test pages

Static HTML test clients are served from `public/`:

- `public/test-game.html`
- `public/test-direct-chat.html`
