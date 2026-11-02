# mindppz — Research Voices PhD Survey (Firebase)

A web survey built from **PhD_Research_Support_Survey.pdf** ("Shaping the Next-Generation PhD & Research Support Platform"). It runs entirely on **Firebase's free Spark plan**: Hosting, Authentication and Firestore.

- **Sign in with Gmail first.** Respondents sign in with Google (Firebase Authentication) before they see the survey.
- **10 questions, one per page.** The picture cards are taken from the PDF. Picking "Other" asks the respondent to specify. Unfinished answers are kept in the browser, and respondents can review or update their answers after submitting.
- **Answers are saved in Firestore,** one document per Google account.
- **Admin button** in the header goes to `/admin-login`.
- **Admin panel:** username `chinnu`, password `chinnu12345`. Admins can:
  - see every user who signed in, and whether they completed the survey
  - open each user's full answers
  - see per-question summary charts and every open-text answer
  - export everything to CSV, or delete a response

## One-time Firebase setup (about 10 minutes)

### 1. Create the project
1. Go to https://console.firebase.google.com and click **Create a project**. Google Analytics is optional.
2. **Build → Authentication → Get started → Sign-in method:**
   - enable **Google** (pick a support email)
   - enable **Email/Password**, which the admin login uses
3. **Build → Firestore Database → Create database** (production mode, any region near your users).

### 2. Create the admin account (`chinnu` / `chinnu12345`)
1. **Authentication → Users → Add user:**
   - Email: `chinnu@researchvoices.example.com` (the admin login turns the username `chinnu` into this address)
   - Password: `chinnu12345`
2. Copy the new user's **User UID** from the users list.
3. **Firestore Database → Start collection:**
   - Collection ID: `admins`
   - Document ID: paste the **User UID**
   - Add a field `role` (string) = `admin`, then save.

Only accounts listed in `admins` can see results. No one can add themselves, because the database rules block writes to that collection.

*Optional hardening:* in **Authentication → Settings → User actions**, untick **Enable create (sign-up)**. People can still sign in with Google, but nobody can create new email/password accounts from the website.

### 3. Deploy
You need Node.js 20+ on your computer.

```bash
npm install
npx firebase login
npx firebase use --add          # pick your project; it replaces "your-firebase-project-id" in .firebaserc
npm run deploy                  # builds, then deploys Hosting + Firestore rules
```

Your survey is live at `https://<project-id>.web.app`. Share that link.

On Firebase Hosting, the site loads its Firebase settings automatically, so you don't need to paste any config. To host the files somewhere else, paste your `firebaseConfig` into `public/js/firebase-config.js` and add that domain under **Authentication → Settings → Authorized domains**.

## Changing things

| What | Where |
| --- | --- |
| Questions / options | `public/js/survey-data.js`, then `npm run build` (regenerates `firestore.rules` to match) and deploy |
| Admin password | Firebase console → Authentication → Users → ⋮ → Reset password. Or add another admin: add a user, then add their UID to `admins` |
| Admin username → email | `ADMIN_EMAIL_DOMAIN` in `public/js/firebase-config.js` |
| Design | `public/css/style.css` |

## Local development and tests

```bash
npm install
npm run build        # bundles the Firebase SDK + generates firestore.rules
npm run emulators    # local Auth + Firestore + Hosting at http://127.0.0.1:5000
npm test             # Firestore security-rules tests (needs Java for the emulator)
```

With the emulators running, the site automatically uses them. To get into the admin panel locally, create the admin in the Auth emulator and add an `admins/<uid>` document in the Firestore emulator.

## How it is secured

Everything is enforced by **Firestore security rules** (`firestore.rules`), not only by the pages:

- A respondent can only create, read or update **their own** answers, and only when signed in with a verified Google account. Their email must match their Google account.
- Answers must follow the survey exactly: valid option IDs, the "up to 3" and single-choice limits, "Other" text only when Other is chosen, and length limits. Timestamps come from the server, so they can't be faked.
- Only accounts in `admins` can list everyone's answers or delete a response. Admins cannot alter answers.
- All other database paths are closed.

The rules are generated from the survey definition by `scripts/build.js`, and `tests/rules.test.js` checks them (15 tests).

## Project layout

```
public/                 Website (deployed to Firebase Hosting)
  index.html            Landing page + Google sign-in + Admin button
  survey.html           Survey: one question per page
  admin-login.html      Admin login
  admin.html            Results dashboard
  js/survey-data.js     The 10 questions from the PDF + answer validation
  js/fb.js              Firebase setup (auto-config, emulators)
  js/firebase-config.js Optional manual config + admin email domain
  js/vendor/firebase.js Bundled Firebase SDK (built by `npm run build`)
  img/                  Illustrations taken from the PDF
firestore.rules         Generated security rules
scripts/build.js        Build: SDK bundle + rules generation
tests/rules.test.js     Security-rules tests
firebase.json           Hosting / Firestore / emulator settings
```
