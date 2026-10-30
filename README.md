# Vidyalaya One — Starter Portal

A responsive static landing page for PM SHRI Kendriya Vidyalaya No. 1 Itanagar.

## Included
- `index.html` — portal homepage and four application tiles.
- KVS SAMAGAM currently links to `https://samagam.kvs.gov.in/`.
- Timetable & School Duty Hub, Academic Progress & Student Support, and Examination Management Centre are placeholders until their URLs/apps are ready.

## Deploy on Vercel
1. Create a new GitHub repository named `vidyalaya-central-portal`.
2. Upload `index.html` to the repository root.
3. In Vercel, choose **Add New → Project**, import the new repository, and deploy.
4. For this static HTML page, no build command is needed; the root directory should contain `index.html`.

## Important security note
This starter is a public-facing static page unless access is restricted through a suitable deployment/authentication setup. It does not include authentication, staff roles, permissions, or confidential student data. Add secure server-side authentication and authorization before using it for internal or sensitive school operations.

## Live application tiles with Firebase

The bundled tiles, including MEDHA immediately after PRASHAST, work without Firebase.
`portal-firebase.js` listens to `portal/applications` in Realtime Database and updates
open pages automatically when that public catalogue changes. Empty data, denied
access, or unavailable Firebase preserves the bundled cards. Use only public titles,
notes and HTTPS links here; never put student or confidential data in this path.

One-time Firebase Console setup (project `vidyalaya-one-app`):

1. Realtime Database → Data: create/select the `portal` child, then use its menu
   **Import JSON** with `firebase-applications.json`. Import into `/portal`, not the
   database root, to preserve unrelated data. The file contains an `applications` key.
2. Realtime Database → Rules: for the currently empty, locked database, use
   `database.rules.json` and click Publish. It permits public reads only at
   `/portal/applications` and denies all client writes. If you already have other
   rules, merge this path rather than overwriting those rules.
3. Edit application titles, notes and URLs under `/portal/applications` in the
   Firebase Console. Connected devices update without a new Vercel deployment.
   Firebase Console access is required to edit; no public write rule is needed.

For Vercel, connect this GitHub repository with production branch `main`, framework
preset Other, repository root directory, and no build command. A push to `main`
should trigger the linked project's deployment. GitHub publishing alone does not
prove a Vercel deployment succeeded; check its deployment status and live page.


## CBSE Students Basic Data

The CBSE card now opens `cbse-students.html`, with a separate Principal workspace
at `cbse-admin.html`. See [CBSE_SETUP.md](CBSE_SETUP.md) for the one-time Firebase
Authentication and database rules setup, private CSV/JSON import, and publishing.
No student records or Principal password are included in this repository.

Checks: `node --test tests/cbse-model.test.mjs`. For browser checks, serve the root
with `python3 -m http.server 8000 --bind 127.0.0.1`, then run
`python3 tests/cbse-browser.py` with Python Playwright and Chromium installed.
Browser tests use synthetic students and mocked Firebase services. They do not
validate a live Firebase deployment or replace database-rule enforcement tests.

Password settings checks: `python3 tests/cbse-password-browser.py` (same local
server and browser requirements). Tests use synthetic credentials only.
