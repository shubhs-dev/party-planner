@AGENTS.md

# Party Planner

A small web app our team uses to plan parties (first up: the end-of-year party).
People join with a fake name plus an animal avatar, then a party moves through three phases:

1. **Ideas** – everyone adds venue/activity ideas (name, maps/website link, photos, cost info).
2. **Idea voting** – everyone gets a vote budget; the organizer crowns a winner or runs a runoff of the top N.
3. **Dates** – everyone proposes dates, then votes on them the same way.

Then the party is **done** and shows the winning idea + date with confetti.

Keep it simple. This is a small team tool: prefer boring, obvious code over abstractions,
and don't add services, queues, cron jobs or state libraries unless a requirement truly needs one.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, deployed on **Vercel**.
  - `cacheComponents` is deliberately **off**: every page is per-user and dynamic, so we use the
    classic request-time rendering model. Don't turn it on or add `'use cache'` without a reason.
  - Next 16 differs from older versions (e.g. `proxy.ts` replaces `middleware.ts`, `params` and
    `cookies()` are async). Check `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Tailwind CSS v4** (config lives in `src/app/globals.css` via `@theme`, there is no tailwind.config).
- **Turso / libSQL** (SQLite) via **Drizzle ORM**. Local dev uses a plain file (`file:local.db`), no Docker.
- Auth: name + passcode, hashed with `bcryptjs`, session is a signed JWT cookie (`jose`).
- Avatars: 100 Twemoji animal SVGs vendored in `public/animals/` (CC-BY 4.0, attribution in README/footer).
- Photo uploads are downscaled in the browser and stored in the DB (`uploads` table), served by
  `src/app/uploads/[id]/route.ts`. No blob storage service.

## Commands

```bash
npm run dev          # start dev server on :3000 (creates/uses local.db)
npm run db:migrate   # apply migrations in drizzle/ to DATABASE_URL
npm run db:generate  # after editing src/lib/db/schema.ts, generate a new migration
npm test             # vitest (pure logic in src/lib/*.test.ts)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

Before committing: `npm run typecheck && npm run lint && npm test` must pass.

## Environment

See `.env.example`. `DATABASE_URL` defaults to `file:local.db`; `SESSION_SECRET` is required in
production; `INVITE_CODE` (optional) gates sign-up since the app is public.

## Layout

```
src/app/                    routes (pages are Server Components)
  actions/                  server actions ('use server'), one file per area
  parties/[id]/             the party page; renders the current phase
  uploads/[id]/route.ts     serves uploaded images
src/components/             UI components (client components marked 'use client')
src/lib/
  db/schema.ts              Drizzle schema (source of truth for tables)
  db/index.ts               db client
  auth.ts                   session cookie + getCurrentUser/requireUser
  animals.ts                the 100 animals (slug, name, emoji, colour)
  phases.ts                 PURE phase/voting logic (budget, tallies, auto-advance) – unit tested
  party.ts                  loads a party and applies deadline-based auto-advance
  preview.ts                link preview fetcher (og:title/og:image) with SSRF guard
drizzle/                    generated SQL migrations (commit these)
```

## Rules of the domain

- Phases, in order: `ideas` → `idea_voting` → `dates` → `date_voting` → `done`.
- The party creator is the **organizer**. They can advance phases early, set phase deadlines,
  crown a winner, start a runoff and delete any idea/date.
- Deadlines are checked **lazily** whenever a party is loaded (`syncPhase` in `src/lib/party.ts`);
  there is no cron. An expired voting phase auto-crowns the leader (ties → earliest added).
  A phase with no options doesn't auto-advance.
- Vote budget = `clamp(ceil(options / 3), 1, 5)`, at most one vote per option.
  Votes are per round; a runoff eliminates everything outside the top N and starts a new round.
- Vote counts are hidden from regular members until voting closes; the organizer sees them live.
- Every server action re-checks the session and permissions itself. Never trust the client.

## Conventions

- Business rules go in `src/lib/phases.ts` as pure functions with tests; actions/pages call them.
- Server actions return `{ error?: string }` for form errors (used with `useActionState`) and call
  `revalidatePath` for the affected page.
- IDs are random strings from `crypto.randomUUID()`; timestamps are epoch milliseconds.
- UI tone: celebratory but readable. Use the existing tokens/classes in `globals.css`
  (`card`, `btn`, `btn-primary`, etc.) before inventing new styles. Mobile first.
