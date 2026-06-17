# Card Game Backend - Technical Handover

Prepared from repository evidence in `Card-Game-BackEnd` on branch `main`.

Evidence policy used:
- **Verified from repository**: explicit in source, config, or files in this checkout
- **Inferred from code**: derived from implementation behavior
- **Not Found in Repository**: no verifiable evidence in this checkout

---

# Project Overview

## Purpose of the application

- **Verified from repository**: Backend API and real-time server for a multiplayer card game platform.
- **Verified from repository**: Supports room creation/matchmaking, turn-based card flips, wallet balances (real money and coins), deposits/withdrawals, KYC, friends, lobby/direct chat, notifications, leaderboards, and admin moderation.

## Main user types

| Role | Source | Capabilities (summary) |
|------|--------|------------------------|
| `user` | `src/utils/constants.utility.ts` (`USER_TYPE.USER`) | Play games, manage wallet, friends, chat, KYC, withdrawals |
| `admin` | `src/utils/constants.utility.ts` (`USER_TYPE.ADMIN`) | Ban/unban players, refunds, disputes, KYC review, dashboard, audit logs |

Note: `docs/README.md` references `SUPER_ADMIN` in places, but code uses only `user` and `admin` (`USER_TYPE` enum, `admin.routes.ts`).

## Major modules/features

| Area | REST prefix / entry | Key files |
|------|---------------------|-----------|
| Auth | `/api/v1/auth` | `src/modules/auth/` |
| Game modes | `/api/v1/modes` | `src/modules/mode/` |
| Rooms | `/api/v1/room` | `src/modules/room/` |
| Game (REST) | `/api/v1/game` | `src/modules/game/` |
| Flip requests | `/api/v1/flip` | `src/modules/flip/` |
| Wallet | `/api/v1/wallet` | `src/modules/wallet/` |
| Payments | `/api/v1/payments` | `src/modules/payment/` |
| Withdrawals | `/api/v1/withdrawals` | `src/modules/withdrawal/` |
| KYC | `/api/v1/kyc` | `src/modules/kyc/` |
| Notifications | `/api/v1/notifications` | `src/modules/notification/` |
| Leaderboard | `/api/v1/leaderboard` | `src/modules/leaderboard/` |
| Chat | `/api/v1/chat` | `src/modules/chat/` |
| Friends | `/api/v1/friends` | `src/modules/friends/` |
| Admin | `/api/v1/admin` | `src/modules/admin/` |
| Real-time gameplay | Socket.IO on same HTTP server | `src/socket/game.socket.ts`, `src/socket/index.ts` |

---

# Tech Stack

| Layer | Technology | Evidence |
|-------|------------|----------|
| Runtime | Node.js >= 22 | `package.json` `engines` |
| Language | TypeScript | `tsconfig.json`, `src/**/*.ts` |
| HTTP API | Express 4 | `package.json`, `src/app.ts` |
| Real-time | Socket.IO 4 | `package.json`, `src/socket/` |
| Database | MongoDB + Mongoose 7 | `package.json`, `src/models/` |
| Cache / game state | Redis (ioredis) | `package.json`, `src/config/redis.ts` |
| Auth | JWT + bcrypt | `jsonwebtoken`, `bcryptjs`, `src/middlewares/auth.middleware.ts` |
| Validation | Joi | `package.json`, `src/middlewares/validation.middleware.ts` |
| Payments | Stripe SDK | `package.json`, `src/utils/stripe.utility.ts` |
| API docs | swagger-jsdoc + swagger-ui-express | `src/utils/swagger.ts` |
| File upload | multer | `package.json` |
| Security headers | helmet | `src/app.ts` |

## Infrastructure

**Status: Not Found in Repository**

No Dockerfile, docker-compose, Kubernetes manifests, PM2 config, Nginx config, or deployment scripts were found.

## Third-party services

| Service | Usage | Status |
|---------|-------|--------|
| MongoDB | Primary datastore | Verified from repository |
| Redis | Game state, disconnect handling, caching | Verified from repository |
| Stripe | Credit card deposits, webhooks, wallet transfers | Verified from repository |
| PayPal / Google Pay | Enum values and placeholder URLs in payment flow | Partial - not fully integrated in `payment.service.ts` |

---

# High-Level Architecture

## Application flow

```
Client (HTTP + Socket.IO)
        |
        v
Express app (src/app.ts)  +  Socket.IO (src/socket/index.ts)
        |                           |
        +-- /api/v1/* REST routes   +-- game, chat, friend, wallet events
        |
        +-- MongoDB (persistent data)
        +-- Redis (active game state, player disconnect tracking)
        +-- Stripe (payments)
```

1. `src/server.ts` loads env, attaches MongoDB connection middleware, starts HTTP server with Socket.IO, and starts the leaderboard scheduler.
2. REST routes mount under `/api/v1` (`src/routes/index.ts`).
3. Socket connections authenticate via JWT in handshake header `token` (`src/socket/game.socket.ts`).
4. Active game state is stored in Redis keys such as `game:{roomId}` (`src/utils/disconnection.utility.ts`).
5. On MongoDB connect, default admin user is ensured (`src/config/connection.ts`, `src/utils/user.utility.ts`).

## Architecture diagram

```
+------------------+     HTTP/WS      +------------------------+
|  Game Client     |----------------->|  Express + Socket.IO   |
|  (not in repo)   |                  |  src/server.ts         |
+------------------+                  +-----------+------------+
                                                  |
                    +-----------------------------+-----------------------------+
                    |                             |                             |
                    v                             v                             v
             +-------------+              +-------------+              +-------------+
             |  MongoDB    |              |   Redis     |              |   Stripe    |
             |  (Mongoose) |              |  (ioredis)  |              |   API       |
             +-------------+              +-------------+              +-------------+
```

---

# Repository Structure

| Path | Purpose |
|------|---------|
| `src/server.ts` | Entry point; starts HTTP server and scheduler |
| `src/app.ts` | Express app, middleware, `/health`, `/api/v1` routes, Swagger |
| `src/routes/index.ts` | Route registry for all modules |
| `src/modules/` | Feature modules (auth, room, game, wallet, payment, etc.) |
| `src/models/` | Mongoose schemas |
| `src/socket/` | Socket.IO setup and game event handlers |
| `src/middlewares/` | Auth, role, validation middleware |
| `src/config/` | DB connection, Redis client, index setup script |
| `src/utils/` | Shared utilities (JWT, shuffle, mail helpers, schedulers) |
| `docs/` | Module API documentation (11 markdown files) |
| `public/` | Static test HTML pages |
| `postman_collection.json` | Postman collection |

---

# Environment Configuration

## Environment files

| File | Usage | Status |
|------|-------|--------|
| `.env.example` | Committed template | Verified from repository |
| `.env` | Local runtime (gitignored) | Verified from `.gitignore` |

## Variables in `.env.example`

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP listen port (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiry (default `7d` in example) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `NODE_ENV` | Runtime environment |

## Additional variables used in code (not in `.env.example`)

| Variable | Purpose | Source |
|----------|---------|--------|
| `REDIS_URL` | Redis connection URL | `src/config/redis.ts` |
| `ADMIN_EMAIL` | Default admin email for seeding | `src/utils/user.utility.ts` |
| `ADMIN_PASSWORD` | Default admin password for seeding | `src/utils/user.utility.ts` |
| `BASE_URL` | KYC callback/base URL | `src/modules/kyc/kyc.service.ts` |

Do not commit real secrets. Use placeholders in `.env.example` only.

---

# Local Development Setup

## Prerequisites

- Node.js 22+ (`package.json` `engines`)
- MongoDB instance
- Redis instance (required for active game state and disconnect handling)
- Stripe test credentials for payment testing

## Commands

```bash
npm install
cp .env.example .env
# Set MONGO_URI, JWT_SECRET, STRIPE_*, REDIS_URL in .env
npm run dev
```

## Verify

```bash
curl http://localhost:5000/health
# {"ok":true,"ts":...}

# Swagger UI
# http://localhost:5000/api-docs
```

## Startup order

**Inferred from code**

1. MongoDB must be reachable before routes that depend on DB.
2. Redis should be running before gameplay/disconnect flows.
3. Server starts leaderboard scheduler automatically on listen (`src/server.ts`).

## Optional admin script

Database index setup is a standalone script, not run on startup:

```bash
npx ts-node src/config/indexes.ts setup
```

(`src/config/indexes.ts`)

---

# Deployment Process

**Status: Not Found in Repository**

No hosting platform, CI/CD pipeline, or deployment automation is defined in this repository.

`docs/README.md` lists staging/production URLs (`staging.api.cardgame.com`, `api.cardgame.com`) but those hostnames are not referenced in application source or config files in this checkout.

---

# External Integrations

## MongoDB

- **Purpose**: Users, rooms, transactions, KYC, chat, notifications, stats
- **Files**: `src/config/connection.ts`, `src/models/`
- **Notes**: `ensureAdminExists()` runs after successful connection

## Redis

- **Purpose**: Active game state, player disconnect status, bot replacement tracking
- **Files**: `src/config/redis.ts`, `src/utils/disconnection.utility.ts`, `src/utils/redis.utility.ts`
- **Notes**: Falls back to a hardcoded Redis URL in source when `REDIS_URL` is unset (`src/config/redis.ts`). Set `REDIS_URL` in environment for all deployments.

## Stripe

- **Purpose**: Credit card deposits via Checkout, webhook processing, wallet transfers
- **Files**: `src/utils/stripe.utility.ts`, `src/modules/payment/`, `src/modules/wallet/wallet.controller.ts`
- **Webhook routes**:
  - `POST /api/v1/payments/webhook/stripe` (`payment.routes.ts`)
  - Wallet Stripe webhook handler in `wallet.routes.ts`
- **Notes**: `STRIPE_SECRET_KEY` is required at startup (`stripe.utility.ts` throws if missing)

## PayPal / Google Pay

- **Purpose**: Listed as payment/withdrawal methods in models and enums
- **Files**: `src/modules/payment/payment.service.ts`, `src/modules/withdrawal/withdrawal.service.ts`
- **Notes**: **Partial** - code contains placeholder checkout URLs; Stripe is the implemented card provider

## Google login (client-trusted)

- **Purpose**: Register/login users with `googleId` from client payload
- **Files**: `src/modules/auth/auth.routes.ts` (`POST /auth/google`)
- **Notes**: **Inferred from code** - endpoint accepts `googleId`, `email`, `name` in request body; no Google token verification library found in `package.json`

---

# Critical Business Logic

## Dual wallet system

**Verified from repository** (`src/models/User.model.ts`, `WALLET_TYPE` enum)

- `REAL_MONEY`: depositable/withdrawable balance with locked amounts for entry fees
- `FREE_COIN`: in-game coins with separate balance/lock tracking
- Coin packages defined in `COIN_PACKAGES` (`src/utils/constants.utility.ts`)
- Daily ad reward limit: `DAILY_AD_LIMIT = 10`

## Room and game rules

**Verified from repository** (`src/modules/room/room.validation.ts`, postman examples)

- Room types: `PUBLIC`, `PRIVATE`
- Game lengths: `26` or `52` (card/round configuration)
- Max players: `2`, `4`, or `13`
- Wallet type per room: `FREE_COIN` or `REAL_MONEY`
- Scheduled rooms via `POST /api/v1/room/schedule` with conflict detection within +/- 1 hour (`room.service.ts`)

## Card dealing and turns

**Verified from repository**

- Deck built and shuffled with seeded randomness (`src/utils/shuffle.ts`, `buildDeck`, `seededShuffle`)
- Default turn timer: `DEFAULT_TIMER_MS = 7000` (`constants.utility.ts`)
- Game events handled over Socket.IO (`create_room`, `join_room`, `flip_card`, etc. in `game.socket.ts`)

## Disconnection handling

**Verified from repository** (`src/utils/disconnection.utility.ts` header comments and implementation)

1. Player marked disconnected in Redis
2. Auto-flip after 3 seconds if it is their turn
3. Bot replacement after 1 minute grace period
4. Replaced players cannot reconnect (`GAME_ERROR.CANNOT_RECONNECT`)

## Payments

**Verified from repository** (`src/modules/payment/payment.service.ts`, constants)

- Min deposit: `$1` (`MIN_DEPOSIT_AMOUNT`)
- Max deposit: `$10,000` (`MAX_DEPOSIT_AMOUNT`)
- Deposit fee: `3%` (`DEPOSIT_FEE_PERCENTAGE`)
- Credit card path uses Stripe Checkout session
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET`

## Withdrawals and KYC

**Verified from repository**

- Min withdrawal: `$50` (`MIN_WITHDRAWAL_AMOUNT`)
- Withdrawal methods enum: `BANK_ACCOUNT`, `PAYPAL`, `GOOGLE_WALLET`
- KYC module present; S3/Onfido integrations appear commented out in `kyc.service.ts`

## Admin seeding

**Verified from repository** (`src/utils/user.utility.ts`)

- On DB connect, creates admin user if missing
- Defaults: `ADMIN_EMAIL` or `admin@gmail.com`, `ADMIN_PASSWORD` or `Admin@123`
- Change these via environment variables before any deployment

## Leaderboard updates

**Verified from repository** (`src/utils/leaderboardScheduler.utility.ts`)

- Runs immediately on server start, then every hour via `setInterval` (3600000 ms)
- Calls `leaderboardService.updateAllLeaderboards()`
- Stopped on `SIGTERM` / `SIGINT`

---

# Scheduled Jobs

| Job | Trigger | File | Status |
|-----|---------|------|--------|
| Leaderboard refresh | On startup + every 1 hour | `src/utils/leaderboardScheduler.utility.ts` | Verified from repository |
| Scheduled room reminders | 5 minutes before `scheduledStartTime` | `src/modules/room/room.service.ts` | Inferred from code |
| Bot replacement after disconnect | Timeout-based in disconnect handler | `src/utils/disconnection.utility.ts` | Verified from repository |
| External cron / queue workers | - | - | Not Found in Repository |

---

# Known Issues / Technical Debt

| Item | Detail | Status |
|------|--------|--------|
| Hardcoded Redis fallback URL | `src/config/redis.ts` contains embedded credentials when `REDIS_URL` unset | Verified from repository |
| Hardcoded admin defaults | `admin@gmail.com` / `Admin@123` fallbacks in `user.utility.ts` | Verified from repository |
| JWT secret fallbacks | `change-me` and `default-secret` fallbacks in config/room code | Verified from repository |
| Incomplete `.env.example` | Missing `REDIS_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BASE_URL` | Verified from repository |
| PayPal/Google Pay stubs | Placeholder URLs, not full integrations | Verified from repository |
| Docs vs code role mismatch | Docs mention `SUPER_ADMIN`; code uses `user`/`admin` only | Verified from repository |
| Docs reference missing files | `docs/README.md` references `CHANGELOG.md`, `PHASE_3_SECURITY_AUDIT.md`, etc. not present in repo | Verified from repository |
| Google auth trust model | `/auth/google` trusts client-supplied `googleId` without server-side OAuth verification | Inferred from code |
| Socket CORS | `origin: "*"` on Socket.IO server | Verified from repository |

---

# Operational Notes

| Topic | Status | Detail |
|-------|--------|--------|
| Branching | Verified from repository | `main` branch; remote `origin/main` |
| Release process | Not Found in Repository | |
| Feature flags | Not Found in Repository | |
| Data migrations | Not Found in Repository | Schema in Mongoose models; optional index script |
| Service startup order | Inferred from code | MongoDB, Redis, then Node server |
| Admin bootstrap | Verified from repository | Auto-created on first DB connection |
| Index maintenance | Verified from repository | Manual: `npx ts-node src/config/indexes.ts setup` |
| Backup / restore | Not Found in Repository | |
| Postman testing | Verified from repository | `postman_collection.json` at repo root |
| Static test clients | Verified from repository | `public/test-game.html`, `public/test-direct-chat.html` |

---

# Infrastructure Ownership

| Item | Status | Detail |
|------|--------|--------|
| Repository hosting | Verified from repository | `https://github.com/nikunjgoyani5/Card-Game-BackEnd.git` |
| Database provider | Not Found in Repository | `MONGO_URI` format implies MongoDB; host not specified in repo |
| Redis provider | Partial | Hardcoded fallback hostname in `redis.ts` suggests Redis Cloud; not documented as official deployment target |
| Server hosting | Not Found in Repository | |
| DNS / CDN | Not Found in Repository | |
| Stripe account | Not Found in Repository | Credentials via env vars only |

---

# Handover Checklist

| Item | Status |
|------|--------|
| Source code available | Verified |
| Deployment process documented | Not Found in Repository |
| Environment variables documented | Verified (this document; `.env.example` is partial) |
| Integrations documented | Verified (MongoDB, Redis, Stripe; PayPal/Google partial) |
| Known issues documented | Verified |
| Infrastructure documented | Partial (repository URL only) |

---

# Quick reference

| Item | Value |
|------|-------|
| Dev command | `npm run dev` |
| Default port | `5000` |
| Health | `GET /health` |
| API base | `/api/v1` |
| Swagger | `/api-docs` |
| Module docs | `docs/README.md` |
