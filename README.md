# Robin

**Part of the [Ritualware Suite](https://ritualware.app)**

Robin is the command center. It aggregates data from every app in the suite and presents it in a single dashboard: your glow up score, style archetype, FIRE plan, neighborhood match, burnout status, dating profile, creative goals, and VILE empire metrics — all in one place.

## What it does

- **User Dashboard** — Pulls your latest result from every suite app into one view
- **VILE Corp Dashboard** — Tracks content pipeline, platform follower counts, revenue streams, and empire phase
- **Fraud Case Tracker** — Research workspace for fraud investigations
- **Cross-app linking** — Links out to Glow Up, Ritualwhere, Ritualwealth, Studio, and Vile Style Oracle

## Who it's for

Elle — and any VILE community member who wants a single view of their life systems.

## Run locally

```bash
cp .env.example .env.local   # add your Supabase credentials
npm install
npm run dev
```

## Test

```bash
npm test
```

## Stack

- React + Vite
- Zustand (auth, theme)
- Supabase (auth, reads from all suite tables)
- Tailwind CSS
- Deployed on Vercel

## Data

Robin **reads** from tables owned by other apps (glow_up_results, style_profiles, fire_quiz_results, neighborhood_results, etc.) and **owns** the VILE empire tables.

See [`supabase/schema.sql`](supabase/schema.sql) for Robin's owned tables:
`robin_dashboard_config`, `vile_platform_stats`, `vile_content_pipeline`, `vile_revenue_streams`, `vile_empire_settings`, `vile_fraud_cases`.
