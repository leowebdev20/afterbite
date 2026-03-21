# AfterBite

AfterBite is a mobile-first PWA to track meals and body symptoms, discover food correlations, and generate personalized impact scores.

## Tech Stack
- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- API layer: tRPC v11 + Zod
- Database: PostgreSQL (Supabase free tier suggested)
- ORM: Prisma
- Styling/UI: Tailwind CSS + shadcn/ui + Radix primitives
- Server state: TanStack Query (through tRPC)
- Client state: Zustand (for local UI state)
- Testing: Vitest (unit) + Playwright (e2e)
- Deployment: Vercel + Supabase

## Why This Stack
- Modern and widely adopted in full-stack TypeScript teams.
- Strong type-safety from UI to DB.
- Free-tier friendly for MVP.
- Scales from solo project to production architecture.

## Getting Started

### 1) Prerequisites
- Node.js 20+
- pnpm 10+ (or use `corepack pnpm ...` if pnpm is not globally installed)
- PostgreSQL instance (local Docker or Supabase)

### 2) Install dependencies
```bash
pnpm install
```

### 3) Configure environment
```bash
cp .env.example .env
```
Update `DATABASE_URL` in `.env`.

Example local URL (default):
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afterbite"
```

If you don't have local Postgres running yet, use a free Supabase project and paste its connection string.

### 4) Prepare database
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5) Run development server
```bash
pnpm dev
```
Open `http://localhost:3000`.

## Scripts
- `pnpm dev`: start dev server
- `pnpm build`: production build
- `pnpm start`: run production server
- `pnpm lint`: run ESLint
- `pnpm typecheck`: run TypeScript checks
- `pnpm test`: run Vitest once
- `pnpm test:watch`: run Vitest watch mode
- `pnpm test:e2e`: run Playwright mobile e2e tests
- `pnpm db:generate`: Prisma client generation
- `pnpm db:migrate`: create/apply migration in dev
- `pnpm db:push`: push schema without migration files
- `pnpm db:seed`: seed demo user + ingredient catalog
- `pnpm db:security:rls`: enable+enforce RLS and block `anon/authenticated` table access in Supabase `public` schema

## Supabase Security (RLS Alert Fix)
If Supabase warns with `rls_disabled_in_public`, run:

```bash
pnpm db:security:rls
```

This executes [`prisma/security/enable_rls.sql`](/Users/leonardo/Documents/coding/afterbite/prisma/security/enable_rls.sql), which:
- enables RLS on all app tables
- forces RLS
- adds deny policies for `anon` and `authenticated`
- revokes direct grants for those roles

This is correct for the current architecture (server-side Prisma).  
When you later add Supabase client-side auth access, replace deny policies with user-scoped policies.

## Current App Routes (Scaffold)
- `/`: Home dashboard (live daily score query)
- `/log-meal`: Working meal logging flow (ingredient search, custom ingredient, save meal)
- `/log-symptoms`: Working slider-based symptom logging flow
- `/summary`: Daily summary placeholder
- `/insights`: Food impact insights placeholder
- `/recipes`: Recipe builder placeholder
- `/ingredient/[id]`: Ingredient impact page placeholder

## Architecture Overview

### Frontend
- Mobile-first App Router pages.
- Shared UI components in `src/components`.

### Backend
- tRPC route at `/api/trpc/[trpc]`.
- Domain routers:
  - `meal`
  - `symptom`
  - `recipe`
  - `insight`
  - `forecast`

### Data Model
Prisma models include:
- `User`
- `Ingredient`
- `Meal`, `MealItem`
- `SymptomLog`, `SymptomEntry`
- `Recipe`, `RecipeItem`
- `IngredientImpactSnapshot`

### Prediction/Scoring (No paid AI)
The app currently includes deterministic service modules:
- `src/server/services/scoring/impact.ts`
- `src/server/services/correlations/calculate.ts`
- `src/server/services/forecasting/tomorrow.ts`

These provide v1 impact scoring and next-day prediction foundations without paid external APIs.

### Unknown Ingredient Backtrace (planned, no AI)
Planned deterministic feature to detect \"possible new trigger ingredients\" when users feel bad but known ingredients look safe:
- identify unexpected-bad days (score significantly worse than baseline)
- isolate low-history ingredients eaten in prior 48-72 hours
- rank candidates by repetition + symptom overlap + time proximity
- show a watchlist section in Insights with suspicion score and evidence count

## Testing

### Unit tests (Vitest)
```bash
pnpm test
```
Current unit tests validate scoring behavior.

### E2E tests (Playwright, mobile profile)
```bash
pnpm test:e2e
```
Runs with a mobile emulation project (`Pixel 7`) and starts local dev server automatically.

## Deployment Notes
- Deploy app to Vercel.
- Use Supabase Postgres connection string in Vercel env vars.
- Add Auth.js before publish if user accounts are required.

## Git/GitHub Notes
- `docs/` is ignored in `.gitignore` to keep private planning docs out of GitHub.
- Keep `.env` private and never commit secrets.

## Suggested Next Build Steps
1. Build Insights page with ingredient correlation cards and confidence labels.
2. Add unknown culprit backtrace section (`possible new triggers`) in Insights.
3. Add daily summary visualizations and trend comparison.
4. Implement background recomputation job for analytics snapshots.
5. Replace demo user context with Auth.js when preparing publish.
6. Add offline caching for core logging flows (PWA hardening).
