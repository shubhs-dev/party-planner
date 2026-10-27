# 🎉 Party Planner

A small, cheerful web app for planning a team party, from "where should we go?" to "see you on the 19th!".

1. **Join**: pick one of 100 animal avatars and a fake party name (plus a passcode so you can log back in).
2. **Ideas 💡**: everyone adds ideas with a Google Maps or website link, photos and cost info.
   Paste a link and the app grabs its name and preview photo when the site provides one.
3. **Vote 🗳️**: everyone gets about a third as many votes as there are ideas (1–5) and spends them.
   The organizer can crown the winner or run a runoff between the top few.
4. **Dates 📅**: everyone suggests dates, then votes on them the same way.
5. **Party! 🥳**: the winning idea and date, plus confetti.

The person who creates a party is its **organizer**. They can move each step along early, or set a
deadline after which it moves on by itself.

## Running it locally

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000. A local SQLite file (`local.db`) is created and migrated automatically.
Copy `.env.example` to `.env.local` if you want to change any settings.

Other commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Deploying (Vercel + Turso)

1. Create a free database at [Turso](https://turso.tech):
   `turso db create party-planner`, then get its URL (`turso db show party-planner --url`)
   and a token (`turso db tokens create party-planner`).
2. Import this repo into [Vercel](https://vercel.com/new) and set these environment variables:
   - `DATABASE_URL`: the `libsql://…` URL
   - `DATABASE_AUTH_TOKEN`: the token
   - `SESSION_SECRET`: a long random string (`openssl rand -base64 32`)
   - `INVITE_CODE` (optional but recommended): a code people must enter to join
3. Deploy. Each build runs the database migrations before building the app.

## How it's built

Next.js 16 (App Router, server actions) + Tailwind CSS v4 + Drizzle ORM on Turso/libSQL.
There are no other services: photos are shrunk in the browser and stored in the database, and
deadlines are checked whenever someone opens the party, so there's no cron job. See `CLAUDE.md`
for the architecture and conventions.

## Credits

Animal avatars are [Twemoji](https://github.com/jdecked/twemoji) by Twitter, Inc. and other
contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
