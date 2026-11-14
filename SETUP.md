# Journey HQ setup, step by step

This guide assumes you have never set up a web app before. Do the parts in order. Allow about one hour the first time.

**What you are setting up**

| Thing | What it is | Cost |
|---|---|---|
| Your laptop | Runs the app while you test it | Free |
| Neon | The database that stores your tasks, contacts and notes | Free |
| Google Cloud project | Lets the app sign you in and use your Gmail, Calendar, Drive and Tasks | Free |
| Vercel | Puts the app on the internet so you can open it from anywhere | Free |

**Words used in this guide**

- **Terminal**: the window where you type commands. On Windows open **PowerShell** (press Start, type `powershell`, press Enter). On Mac open **Terminal** (press Cmd+Space, type `terminal`, press Enter).
- **Environment variable**: a secret setting, such as a password, that the app reads when it starts. On your laptop they live in a file called `.env.local`.
- **Repository (repo)**: the folder of code, stored on GitHub.

Google, Neon and Vercel change their screens from time to time. If a button has a slightly different name from the one written here, pick the closest match.

---

## Part A. Get the code running on your laptop

### A1. Install Node.js

Node.js is the program that runs the app.

1. Go to https://nodejs.org
2. Download the version marked **LTS** and install it. Accept every default.
3. Close your terminal and open a new one.
4. Check that it worked:

```bash
node -v
```

You should see a version number, `v20.19` or higher. If you see "command not found", restart the laptop and try again.

### A2. Install Git

Git downloads the code and sends your changes back to GitHub.

1. Go to https://git-scm.com/downloads
2. Download and install it. Accept every default.
3. Close your terminal, open a new one and check:

```bash
git --version
```

### A3. Download the code

1. In the terminal, go to the folder where you want the project, for example Documents:

```bash
cd Documents
```

2. Download the repo:

```bash
git clone https://github.com/iamsonu7/decplan.git
```

3. Go into the new folder. **Every later command in this guide is run from inside this folder.**

```bash
cd decplan
```

### A4. Install the app's libraries

```bash
npm install
```

This takes a minute or two. Warnings in yellow are fine. Lines starting with `npm error` are not: copy the message and ask for help.

### A5. Create your settings file

1. Make a copy of the example file:

```bash
cp .env.example .env.local
```

2. Open the `decplan` folder in a code editor. If you do not have one, install VS Code from https://code.visualstudio.com, then choose **File > Open Folder** and pick `decplan`.
3. Open `.env.local` in the editor. You will see six lines ending in `=`. You fill them in during Parts B, C and D.

Rules for this file:

- Put the value straight after the `=`, with no spaces and no quotes. Example: `ALLOWED_EMAIL=myname@gmail.com`
- Never share this file or paste it into a chat. It is deliberately not uploaded to GitHub.

---

## Part B. Create the database (Neon)

1. Go to https://neon.tech and click **Sign up**. Signing up with your Google or GitHub account is quickest.
2. Neon asks you to create a project:
   - **Project name**: `journey-hq`
   - **Region**: choose **Singapore** (the closest to India)
   - Leave everything else as it is and click **Create project**.
3. On the project page click **Connect** (top right).
4. In the box that opens, make sure **Connection pooling** is switched **on**.
5. Click **Copy** next to the long text that starts with `postgresql://`. This is your connection string. It contains the database password, so treat it like a password.
6. In `.env.local`, paste it after `DATABASE_URL=`. The line should look like this (yours will have different letters):

```
DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-name-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

7. Save the file.
8. Create the tables:

```bash
npm run db:migrate
```

You should see `migrations applied successfully!`. If you see an error about `DATABASE_URL`, the line in `.env.local` is empty or the file was not saved.

Later build steps add more tables. Whenever I tell you to, run `npm run db:migrate` again.

---

## Part C. Create the Google Cloud project

This is the longest part. It tells Google that an app called Journey HQ exists and what it is allowed to do with your account.

### C1. Create the project

1. Go to https://console.cloud.google.com and sign in with the Google account you will use for Journey HQ.
2. If Google asks you to agree to terms, agree. You do **not** need to start a free trial or add a card.
3. At the top of the page, click the project selector (it says "Select a project" or shows a project name).
4. Click **New project**.
5. **Project name**: `Journey HQ`. Leave the rest as it is. Click **Create**.
6. Wait a few seconds, click the project selector again and choose **Journey HQ**. Check that the top bar now says Journey HQ. Everything below must be done inside this project.

### C2. Switch on the six Google services

1. Click the menu icon (three lines, top left) > **APIs & Services** > **Library**.
2. In the search box type `Gmail API`, click the result, then click **Enable**.
3. Click the back arrow to return to the Library and repeat for each of these. All six must say "Enabled":

| Search for | Used for |
|---|---|
| Gmail API | Reading replies, creating drafts |
| Google Calendar API | Reminder events |
| Google Drive API | Finding and reading your files |
| Google Docs API | Creating Docs |
| Google Sheets API | Creating Sheets |
| Google Tasks API | Tasks on your phone |

### C3. Describe the app (consent screen)

1. Menu > **APIs & Services** > **OAuth consent screen**. Google may show this under the name **Google Auth Platform**.
2. Click **Get started**.
3. **App information**:
   - App name: `Journey HQ`
   - User support email: choose your own email
   - Click **Next**.
4. **Audience**: choose **External**. Click **Next**.
5. **Contact information**: type your own email. Click **Next**.
6. Tick the box to agree to the policy, click **Continue**, then **Create**.

### C4. Add yourself as a test user

1. In the left menu click **Audience**.
2. Scroll to **Test users** and click **Add users**.
3. Type your own Gmail address and click **Save**.

### C5. Add the permissions (scopes)

A scope is one permission, for example "read Gmail".

1. In the left menu click **Data Access**.
2. Click **Add or remove scopes**. A panel opens on the right.
3. In the list at the top of the panel, tick these three:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
4. Scroll to the bottom of the panel to the box called **Manually add scopes**. Copy all six lines below, paste them into that box and click **Add to table**:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/tasks
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
```

5. Click **Update** at the bottom of the panel.
6. Click **Save** at the bottom of the page. This is easy to miss.

What each one allows:

| Scope ends with | Allows the app to |
|---|---|
| `gmail.readonly` | Read your email threads and spot replies |
| `gmail.compose` | Create drafts, and send only after you confirm |
| `calendar.events` | Create reminder events |
| `tasks` | Copy app tasks into Google Tasks |
| `drive.readonly` | Search and read your Drive files, Docs and Sheets |
| `drive.file` | Create new Docs and Sheets and edit only those |

If Google says a scope cannot be found, tell me which one. I could not check these names against Google's live documentation from my side.

### C6. Create the sign-in keys (OAuth client)

1. In the left menu click **Clients**, then **Create client**.
2. **Application type**: **Web application**.
3. **Name**: `Journey HQ web`.
4. Leave "Authorised JavaScript origins" empty.
5. Under **Authorised redirect URIs** click **Add URI** and paste exactly:

```
http://localhost:3000/api/auth/callback/google
```

6. Click **Create**.
7. A box shows a **Client ID** and a **Client secret**. Keep it open.
8. In `.env.local`:
   - paste the Client ID after `AUTH_GOOGLE_ID=` (it ends in `.apps.googleusercontent.com`)
   - paste the Client secret after `AUTH_GOOGLE_SECRET=` (it starts with `GOCSPX-`)
9. Save the file. If you closed the box too early, click the client's name in the Clients list to see the values again.

---

## Part D. Fill in the last three settings

### D1. Your email

In `.env.local`, type your Gmail address after `ALLOWED_EMAIL=`. Only this account can ever sign in.

### D2. Two random secrets

The app needs two long random values: one to protect your login session and one to encrypt the Google tokens in the database.

1. Run this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. It prints a line of random characters ending in `=`. Copy it and paste it after `AUTH_SECRET=`.
3. Run the same command **again**. It prints a different value. Paste that one after `TOKEN_ENCRYPTION_KEY=`.
4. Save the file.

Never change `TOKEN_ENCRYPTION_KEY` afterwards. If you do, the app can no longer read the stored Google tokens, and you must sign out and sign in again.

### D3. Check the file

All six lines should now have a value:

```
ALLOWED_EMAIL=myname@gmail.com
AUTH_SECRET=k3J...=
AUTH_GOOGLE_ID=1234-abc.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-...
TOKEN_ENCRYPTION_KEY=Zx9...=
DATABASE_URL=postgresql://...
```

---

## Part E. Run it and sign in

1. Start the app:

```bash
npm run dev
```

2. Wait until the terminal shows `Local: http://localhost:3000`.
3. Open http://localhost:3000 in your browser. You should see the Journey HQ sign-in card.
4. Click **Sign in with Google** and choose your account.
5. Google shows a warning: **"Google hasn't verified this app"**. This is expected for an app only you use. Click **Advanced**, then **Go to Journey HQ (unsafe)**.
6. Google lists the permissions. **Tick every box** (or "Select all"), then click **Continue**.
7. You land on the **Today** page with four cards. All four should say **OK**.

To stop the app, click in the terminal and press `Ctrl+C`. To start it again, run `npm run dev` from the `decplan` folder.

**Test that strangers are blocked:** open a private browser window, go to http://localhost:3000 and sign in with a different Google account. You should see "That Google account is not allowed to use this app." (Google itself may block the account first, because it is not a test user. Either result is correct.)

---

## Part F. Put it on the internet (Vercel)

Do this after Part E works.

### F1. Deploy

1. Go to https://vercel.com and sign up with **Continue with GitHub**, using the GitHub account that owns the `decplan` repo.
2. Click **Add New** > **Project**.
3. Find `decplan` in the list and click **Import**. If it is not listed, click **Adjust GitHub App Permissions** and give Vercel access to that repo.
4. Open the **Environment Variables** section **before** clicking Deploy. Add all six settings from `.env.local`, one at a time: the name on the left (for example `ALLOWED_EMAIL`), the value on the right, then **Add**.
5. Click **Deploy** and wait about two minutes.
6. Vercel shows your address, something like `https://decplan-abc.vercel.app`. Copy it.

### F2. Tell Google about the new address

1. Back in Google Cloud: **Google Auth Platform** > **Clients** > click **Journey HQ web**.
2. Under **Authorised redirect URIs** click **Add URI** and paste your Vercel address followed by `/api/auth/callback/google`. Example:

```
https://decplan-abc.vercel.app/api/auth/callback/google
```

3. Keep the `localhost` line as well. Click **Save**.
4. Wait five minutes (Google is slow to apply this), then open your Vercel address and sign in.

After this, every time new code is pushed to GitHub, Vercel updates the live app by itself.

---

## Part G. Set the Google app to "In production"

Do this once sign-in works. Until you do, Google signs the app out of your account **every 7 days**.

1. Google Cloud > **Google Auth Platform** > **Audience**.
2. Under **Publishing status** click **Publish app**, then **Confirm**.
3. The status should now read **In production**.

Google may show a message about verification. You can ignore it and do not need to submit anything. You will keep seeing the "Google hasn't verified this app" warning when you sign in, which is fine for a personal app.

---

## Part H. AI key (not needed yet)

This is added when the capture bot is built. I will extend this guide then.

---

## When something goes wrong

| What you see | What it means | Fix |
|---|---|---|
| `command not found: node` or `npm` | Node.js is not installed, or the terminal was open during install | Do A1 again, then open a new terminal |
| `npm error enoent ... package.json` | You are not inside the `decplan` folder | Run `cd Documents/decplan` (or wherever you cloned it) |
| "That Google account is not allowed" | The account you chose is not the one in `ALLOWED_EMAIL` | Fix the email in `.env.local`, stop the app with `Ctrl+C`, run `npm run dev` again |
| Google: `Error 400: redirect_uri_mismatch` | The redirect URI in Google does not match the address you are using | Check C6 step 5 or F2. It must match exactly, including `http` vs `https` and no extra `/` at the end |
| Google: `Error 403: access_denied` | You are not on the test-user list | Do C4 |
| Sign-in page says "not set up correctly" | A setting in `.env.local` is missing or wrong | Check D3, then restart the app |
| Today page: Database says "Cannot reach the database" | `DATABASE_URL` is wrong | Copy it again from Neon (Part B step 5) |
| Today page: "Connected, but no tables" | The tables were not created | Run `npm run db:migrate` |
| Today page: Google permissions says "Missing: ..." | You left a box unticked on Google's screen | Click **Sign out**, sign in again and tick every box |
| "Google refused to refresh access (invalid_grant)" | Google ended the app's access | Sign out and sign in again. If it happens every week, do Part G |
| You changed `.env.local` and nothing happened | The app reads the file only when it starts | Stop it with `Ctrl+C` and run `npm run dev` again |

If you get stuck, copy the exact error text (never your `.env.local`) and send it to me.
