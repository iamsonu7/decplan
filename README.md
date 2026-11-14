# Journey HQ

A private, single-user career command centre: plan, outreach, contacts, notes and a capture bot, connected to one Google account.

Setup is in [SETUP.md](SETUP.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally at http://localhost:3000 |
| `npm run test` | Run the tests |
| `npm run test:ai` | Send 24 example messages to the real AI and check how they are filed (needs an AI key) |
| `npm run db:generate` | Create a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database in `DATABASE_URL` |
| `npm run db:seed` | Load the December plan (same as the button on the Plan page) |

## Where things live

| What | File |
|---|---|
| Data model | `lib/db/schema.ts` |
| Sign-in and the allowed-account check | `auth.ts`, `lib/allowed.ts` |
| Google scopes | `lib/google/scopes.ts` |
| Encrypted Google token storage and refresh | `lib/google/token.ts`, `lib/crypto.ts` |
| Pages | `app/(app)/` |
| Columns of each table page (Tasks, Outreach, Contacts and so on) | `lib/tables/config.ts` |
| AI providers (Gemini, Anthropic) behind one interface | `lib/ai/` |
| Capture bot: item types, tool schema, filing and undo | `lib/capture/`, `app/capture-actions.ts` |
| The December plan seed data | `lib/seed-plan.ts` |
| Colours and card styles | `app/globals.css` |

## Build status

1. Auth and database: done
2. Pages with seed data: done
3. Capture bot: done
4. Calendar and Tasks
5. Gmail
6. Drive
7. Weekly review
