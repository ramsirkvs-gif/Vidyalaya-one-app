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
4. Use Framework Preset **Other**. `vercel.json` runs `node scripts/build-site.mjs` and publishes the generated `public` directory. No dependency installation is needed.

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
preset Other and repository root directory. The build/output settings in
`vercel.json` generate the public website and deployment version. A push to `main`
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

Faculty feeding is available after Principal login through **Faculty & teacher
roles**, with separate Class X/XII directories and class-teacher assignments.
Publish the updated database rules, then import the original faculty PDF once.
See the faculty section of [CBSE_SETUP.md](CBSE_SETUP.md) for the captured counts,
screenshot defaults, private-data handling, and validation commands.


The Principal signs in once for all protected pages on the same browser/device.
Normal deployments keep that login. Open pages check for app updates every 30
seconds; updates wait for open forms or pending saves before reloading.

Production build checks: `node tests/build-site.test.mjs`. Serve the generated
`public` directory on port 8001 and run
`python3 tests/cbse-session-updates-browser.py` to check persistent-session API
selection and safe deployment reloads with simulated Firebase authentication.

Faculty also supports **Download faculty CSV**, **Import faculty CSV**, and direct
**Convert PDF to CSV**. These use the existing protected faculty schema and do
not require another Console rule update. CSV preserves basic faculty data and
class/co-class teacher assignments; custom responsibilities stay managed in the
page and are included in the complete JSON backup. CSV checks:
`node tests/cbse-faculty-csv.test.mjs`.
