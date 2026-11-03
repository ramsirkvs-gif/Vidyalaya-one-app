# Vidyalaya One — Starter Portal

A responsive static landing page for PM SHRI Kendriya Vidyalaya No. 1 Itanagar.

## Included
- `index.html` — portal homepage and four application tiles.
- KVS SAMAGAM currently links to `https://samagam.kvs.gov.in/`.
- Timetable & School Duty Hub, Academic Progress & Student Support, and Examination Management Centre are placeholders until their URLs/apps are ready.

## Deploy on Vercel

Use the existing `ramsirkvs-gif/Vidyalaya-one-app` repository, production branch
`main`, Framework Preset **Other**, and the repository root. Vercel installs the
locked Firebase Admin SDK dependency, runs `node scripts/build-site.mjs`, and
publishes the generated `public` directory. Serverless PIN routes are under
`api/`. Node 22 is declared in `package.json`.

Principal pages use Firebase Authentication and the configured Principal UID.
The landing page uses the approved published snapshot. Mission staff viewing is
protected by a shared, remembered curtain: staff can browse student history and
contacts without a personal PIN after entering the curtain password once per
browser/device. Each comment or update requires a fresh personal PIN. Principal
controls retain Firebase authorization. Server access uses the protected credential
described in [MISSION_SETUP.md](MISSION_SETUP.md).
No student roster, faculty roster, PIN or service-account key is bundled in the
website source.

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

The CBSE card opens the unified public `cbse-mission.html` dashboard, with a protected Principal workspace
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

## Mission Perfect 100

The CBSE tile opens the X/XII Mission dashboard, with linked section, student and
staff profiles; academic/attendance records; team actions; contacts; monitoring
notes; counsellor/PRT support; and break/remedial timetables. See
[MISSION_SETUP.md](MISSION_SETUP.md) for activation, the corrected CT/Co-CT list,
privacy boundaries, secure faculty PIN setup and validation evidence. Private
Mission access requires the updated rules. Server-verified faculty PINs also
need the protected Vercel credential setting documented there.


Mission Perfect 100 is the single public display/search page. Older
`cbse-students.html` links redirect to it. The responsive dashboard has a global
search, X/XII and section cards, student profile cards, class/section filters and
mobile bottom navigation. Principal feeding/settings are grouped under **Manage
portal** and remain protected. Public results use only the approved published
snapshot; the signed-in Principal can also search private contacts, faculty,
actions and notes. If the public dashboard has no roster, use Students feeding →
Publish. This UI update requires no database-rule change.

Teacher monitoring is a dedicated Mission area, with separate remedial,
worksheet/practice, CT/Co-CT, counsellor, PRT and weekly-review registers.
Structured monitoring fields and existing notes share the current protected
Mission workspace; no new rules are required for this update.

Academic history now supports reviewed private monthly-result packages, X/XII
section/subject filters, teacher allocation links, AB-aware student heatmaps and
subject/monthly graphs. See MISSION_SETUP.md for the import format, /40 workbook
monitoring pattern, month-only dates and privacy/verification details.


Meeting workflows now include full student profiles with call/map and tagged
action controls, CT/subject teacher reviews across sections, verified staff
remarks/replies, and direct Samagam Excel imports that skip existing results by
default. Explicit Correction mode allows reviewed replacements. See
MISSION_SETUP.md for contact permissions, exam-month/rule review and tests.

The unified **Add / Edit Faculty** page includes **Co-opted / Support Members**.
The Principal can add or edit PRTs, counsellors, special educators and other
support members with private photo uploads, email/mobile/WhatsApp contacts and
class/section/subject support responsibilities. New members receive an initial
three-digit PIN through the protected server service. Existing support IDs,
conversation history and PINs are retained on edit; **Open PIN setup** opens the
existing secure PIN controls. Support records remain separate from subject-faculty
CSV data. No database migration or rules change is required.

Regression checks: `node --test tests/staff-service.test.mjs tests/cbse-conversation-model.test.mjs`
and, with the repository served on port 8000, `python3 tests/cbse-support-editor-browser.py`.

## MCQs महाअभियान — Class X / Class XII

Choose the class first. Each class has its own subjects, eligible subject-teacher dropdown and shared question bank. Use the coloured Contribute button to paste 10/20 prepared MCQs, use complete question photos directly, or extract book-photo text into an editable notepad with local English/Hindi OCR, tap A/B/C/D correct answers and confirm submission with a personal PIN. Paper preparation offers topic/ID search, question checkboxes and a running 10/20 selection count. Any eligible teacher can reuse the bank for answer-free A4 papers and reviewed evaluation saved to academic performance. The Principal can open MCQ directly from their workspace and contribute under the authenticated Principal session; staff use personal PINs. Reviewed public 2026–27 syllabus copies supply chapters for X Maths/Science and XII Maths/Physics/Chemistry/Biology, with source links and assessment notes. Direct official-host verification and other subjects remain pending; Mixed, saved topics and Add new topic stay available. See [MCQ_SETUP.md](MCQ_SETUP.md) for details, private storage and validation.
