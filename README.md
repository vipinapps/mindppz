# mindppz — Research Voices PhD Survey

A web survey built from **PhD_Research_Support_Survey.pdf** ("Shaping the Next-Generation PhD & Research Support Platform").

- **Sign in with Gmail first.** Respondents must sign in with their Google account before they see the survey.
- **10 questions, one per page.** The picture cards are taken from the PDF. Questions are multi-select, "up to 3", single choice, or open text. Picking "Other" asks the respondent to specify.
- **Answers are saved on the server** (`data/db.json`), one record per Google account. Respondents can come back to review or update their answers.
- **Admin button** in the header goes to `/admin/login`.
- **Admin panel:** username `chinnu`, password `chinnu12345` (you can change both with environment variables). Admins can:
  - see every user who signed in, and whether they completed the survey
  - open each user's full answers
  - see per-question summary charts and every open-text answer
  - export everything to CSV, or delete a response

## Quick start (local)

```bash
npm install
cp .env.example .env        # then fill in GOOGLE_CLIENT_ID and SESSION_SECRET
npm start                   # http://localhost:3000
```

**Trying it before Google is set up:** run `npm run dev`. The login page then also shows an email-only "dev login". It is ignored when `NODE_ENV=production`, so never rely on it in a real deployment.

## Setting up "Sign in with Google"

1. Go to Google Cloud Console, then **APIs & Services → Credentials** (https://console.cloud.google.com/apis/credentials).
2. Configure the **OAuth consent screen** (External, app name "Research Voices", your support email), and publish it.
3. **Create credentials → OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins**, add every URL the site runs on, for example:
   - `http://localhost:3000`
   - `https://your-domain.com`

   No redirect URI is needed.
5. Copy the client ID (`…apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID`.

The browser receives a Google ID token, and the server checks it with `google-auth-library`: signature, audience and verified email.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | — | Google OAuth Web client ID (required for Google login) |
| `SESSION_SECRET` | random per start | Signs the login cookies. **Set it in production**, or everyone is signed out on each restart. |
| `ADMIN_USERNAME` | `chinnu` | Admin panel username |
| `ADMIN_PASSWORD` | `chinnu12345` | Admin panel password |
| `DATA_DIR` | `./data` | Folder holding `db.json` with all responses |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | — | Set to `production` on a real HTTPS deployment: cookies become secure-only and dev login is off |
| `ALLOW_DEV_LOGIN` | `false` | Email-only login for local testing |

## Deploying

The app is a single Node.js (18+) process: `npm install && npm start`. Any Node host works, such as Render, Railway, Fly.io or a VPS.

- Set the environment variables above, including `NODE_ENV=production`.
- **Use a persistent disk for `DATA_DIR`.** Many free hosts wipe the filesystem on every redeploy, which would delete the responses. Download a CSV backup from the admin panel regularly.
- Add the deployed URL to the Google client's **Authorized JavaScript origins**.

## Project layout

```
server.js            Express server: pages, Google auth, survey API, admin API, CSV export
src/survey.js        The 10 questions (from the PDF) and the server-side answer validation
src/store.js         JSON-file datastore (atomic writes)
public/index.html    Landing page + Google sign-in + Admin button
public/survey.html   Survey (one question per page, progress bar, draft autosave)
public/admin-*.html  Admin login and results dashboard
public/img/          Illustrations taken from the PDF
```

## Security notes

- Survey and admin pages, and all their APIs, check the session on the server, not only in the browser.
- The admin password is compared on the server in constant time, and login is limited to 10 attempts per 15 minutes per IP.
- **The default admin password is weak.** Change `ADMIN_PASSWORD` before sharing the link publicly.
