# Journey HQ

A private, single-user career command centre: plan, outreach, contacts, notes and a capture bot, connected to one Google account.

Setup is in [SETUP.md](SETUP.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally at http://localhost:3000 |
| `npm run test` | Run the tests |
| `npm run db:generate` | Create a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database in `DATABASE_URL` |

## Where things live

| What | File |
|---|---|
| Data model | `lib/db/schema.ts` |
| Sign-in and the allowed-account check | `auth.ts`, `lib/allowed.ts` |
| Google scopes | `lib/google/scopes.ts` |
| Encrypted Google token storage and refresh | `lib/google/token.ts`, `lib/crypto.ts` |
| Pages | `app/(app)/` |
| Colours and card styles | `app/globals.css` |

## Build status

1. Auth and database: done
2. Pages with seed data
3. Capture bot
4. Calendar and Tasks
5. Gmail
6. Drive
7. Weekly review
