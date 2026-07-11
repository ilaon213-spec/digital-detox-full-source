# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## App: 디지털 디톡스

A digital detox web app (react-vite) with 5 tabs:
1. **홈 (Dashboard)** - Current lock status, 24h timeline, challenge summary
2. **타임슬롯 (TimeSlots)** - 15-minute block 24h editor (Sunday-only editing)
3. **앱 차단 (BlockedApps)** - Blocked apps list management (Sunday-only)
4. **챌린지 (Challenge)** - Tier system with deposit (입문자/집중자/독종)
5. **설정 (Settings)** - Notifications, profile, focus timer

Key features:
- "설정의 창" system: Only Sunday allows settings changes
- Server-side time validation (`GET /api/server-time`)
- Focus timer (Pomodoro-style)
- Challenge deposit system with 30-day tracking
- Web Push Notification support
- Fully responsive (mobile/tablet/desktop)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── digital-detox/      # React + Vite digital detox app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

Root commands:
- `pnpm run typecheck:libs` runs `tsc --build` for the composite libs.
- `pnpm run typecheck` is the canonical full check.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/digital-detox` (`@workspace/digital-detox`)

React + Vite frontend. Routes via wouter. Uses `@workspace/api-client-react` for data fetching.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes:
- `GET /api/server-time` - Server time with isSunday flag
- `GET/PUT /api/timeslots` - 96 time slots (15min blocks)
- `GET/PUT /api/blocked-apps` - Blocked app list
- `GET /api/dashboard` - Dashboard aggregated data
- `GET/POST /api/challenge` - Challenge management
- `POST /api/challenge/heartbeat` - Heartbeat
- `GET/PUT /api/settings` - User settings
- `GET/POST /api/focus-timer` - Focus sessions
- `POST /api/focus-timer/:id/complete` - Complete session
- `GET/POST /api/usage-stats` - Screen time stats

### `lib/db` (`@workspace/db`)

Database schemas:
- `time_slots` - 96 15-minute blocks with lock state
- `apps` - Blocked apps list
- `challenges` - Challenge participation records
- `settings` - User preferences
- `focus_sessions` - Focus timer history
- `usage_stats` - Daily screen time records

### `lib/api-spec` (`@workspace/api-spec`)

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
