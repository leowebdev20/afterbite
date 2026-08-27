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
- START APP WITH corepack pnpm dev  

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
`db:seed` inserts realistic sample history (roughly two weeks of meals/symptoms + recipes + impact snapshots) so the app is immediately populated for UI testing.

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
- `pnpm db:seed`: seed demo user + realistic sample history
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

## Current App Routes
- `/`: Home dashboard with live impact score, today's activity, tomorrow prediction, and recent meals.
- `/log-meal`: Meal logging and meal history with ingredient search, custom ingredients, portions, meal type, date/time, edit/delete, and optional recipe save.
- `/log-symptoms`: Symptom logging and symptom history with presets, sliders, date/time, edit/delete, and history filters.
- `/summary`: Daily summary with today's impact, weekly trend, meal count, symptom count, latest symptoms, and meals logged.
- `/insights`: Food impact insights with symptom filters, trigger evidence, example days, recompute action, and possible new culprit watchlist.
- `/recipes`: Recipe builder with create/edit/delete flows and predicted impact preview.
- `/ingredient/[id]`: Ingredient impact detail with symptom breakdown, symptom filtering, trend, and recent symptom entries.
- `/settings`: Time zone, reminder times, profile info, data export/delete, and legal/safety links.
- `/privacy`, `/terms`, `/medical-disclaimer`: Publish-facing legal and safety pages.

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

### Unknown Ingredient Backtrace (No AI)
The app includes a deterministic watchlist for possible new trigger ingredients:
- identifies unexpected-bad days compared with baseline
- isolates low-history ingredients eaten in the correlation window
- ranks candidates by symptom intensity, low sample size, and repetition
- shows a watchlist section in Insights with suspicion score and evidence count

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
1. Replace demo user context with Auth.js and real user isolation.
2. Convert production schema changes into proper Prisma migrations.
3. Move insight snapshot recomputation to a scheduled/background job.
4. Add real reminder notifications and browser permission handling.
5. Turn export data into a downloadable JSON file and add stronger delete confirmation.
6. Add offline caching/queueing for meal and symptom logging.
7. Wire CI for typecheck, lint, unit tests, e2e tests, and build.
