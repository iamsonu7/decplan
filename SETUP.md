# Journey HQ setup

Every manual step, in order. Allow about 30 minutes the first time.
This file grows as build steps land; sections marked "later" are not needed yet.

You need: Node.js 20.19 or newer, a Google account, a GitHub account and a Vercel account.

## 1. Install

```bash
npm install
```

```bash
cp .env.example .env.local
```

You fill in `.env.local` during the steps below.

## 2. Database (Neon, free tier)

1. In Vercel, open your project (create it in step 6 first if you prefer), then **Storage > Create Database > Neon**. Pick the free plan and a region near you (Singapore or Mumbai).
2. Open the database, go to the connection details and copy the **pooled** connection string. It starts with `postgresql://` and its host contains `-pooler`.
3. Put it in `.env.local` as `DATABASE_URL`.
4. Create the tables:

```bash
npm run db:migrate
```

Run that same command again whenever a later build step adds tables.

You can also create the database directly at neon.tech and paste its connection string; the app does not care which way you made it.

## 3. Google Cloud project

1. Go to console.cloud.google.com and create a new project called `Journey HQ`.
2. **APIs & Services > Library**: enable each of these, one by one:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Tasks API
3. **Google Auth Platform > Branding** (older consoles call this "OAuth consent screen"): app name `Journey HQ`, your email as support and developer contact.
4. **Audience**: choose **External**. Add your own Google account under **Test users**.
5. **Data Access > Add or remove scopes**: add these. Paste the long ones into "Manually add scopes".

| Scope | Why |
|---|---|
| `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` | Sign-in |
| `https://www.googleapis.com/auth/gmail.readonly` | Read threads, detect replies |
| `https://www.googleapis.com/auth/gmail.compose` | Create drafts, send after you confirm |
| `https://www.googleapis.com/auth/calendar.events` | Reminder events |
| `https://www.googleapis.com/auth/tasks` | Mirror tasks to your phone |
| `https://www.googleapis.com/auth/drive.readonly` | Search and read files, Docs, Sheets |
| `https://www.googleapis.com/auth/drive.file` | Create Docs and Sheets, edit only those |

6. **Clients > Create client**: type **Web application**, name `Journey HQ web`.
   - Authorised redirect URIs, add both:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-APP.vercel.app/api/auth/callback/google` (add this once you know your Vercel address in step 6)
7. Copy the **Client ID** into `AUTH_GOOGLE_ID` and the **Client secret** into `AUTH_GOOGLE_SECRET`.

## 4. Remaining environment variables

| Variable | Value |
|---|---|
| `ALLOWED_EMAIL` | The one Google account allowed to sign in. Everyone else is rejected. |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `TOKEN_ENCRYPTION_KEY` | Output of `openssl rand -base64 32` (run it again, use a different value from `AUTH_SECRET`) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | From step 3 |
| `DATABASE_URL` | From step 2 |

Do not change `TOKEN_ENCRYPTION_KEY` later. If you do, the stored Google tokens can no longer be read; sign out and sign in again to fix it.

## 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000 and sign in. Google shows an **"unverified app"** warning: click **Advanced > Go to Journey HQ**. This is expected for a personal app. On the permissions screen, tick every box.

## 6. Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New > Project**, import the repository. The framework is detected as Next.js.
3. **Settings > Environment Variables**: add every variable from `.env.local`. If you created Neon through Vercel, `DATABASE_URL` is already there.
4. Deploy. Note the address, for example `https://journey-hq.vercel.app`.
5. Back in Google Cloud, add `https://YOUR-APP.vercel.app/api/auth/callback/google` to the client's redirect URIs (step 3.6).

## 7. Set the OAuth app to "In production"

Once sign-in works: **Google Auth Platform > Audience > Publish app**, so the status reads **In production**.

In "Testing" status Google expires your sign-in every 7 days and the app loses its Google connection each week. In production it does not. You do not need to submit for verification: you will keep seeing the "unverified app" warning when signing in, which is fine for an app only you use.

## 8. AI key (later, with the capture bot)

Added in build step 3.

## Troubleshooting

| What you see | Fix |
|---|---|
| "That Google account is not allowed" | `ALLOWED_EMAIL` does not match the account you signed in with |
| `redirect_uri_mismatch` from Google | The redirect URI in step 3.6 must match your address exactly, including `http` vs `https` |
| Today page says "no tables" | Run `npm run db:migrate` |
| "Google refused to refresh access (invalid_grant)" | Sign out and sign in again. If it happens weekly, do step 7 |
| "Missing: ..." under Google permissions | Sign out, sign in again and tick every box on Google's screen |
