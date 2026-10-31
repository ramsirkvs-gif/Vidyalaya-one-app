# CBSE Students Basic Data: Firebase activation

The implementation is at `cbse-admin.html` (private feeding) and
`cbse-students.html` (public search). Only the CBSE card is changed on the portal.
The portal shows only a password field. It automatically uses the Principal
account `ramsirkvs@gmail.com` for Firebase authentication in the background.
Firebase activation below is still required. No password or student record is
stored in GitHub or the Vercel website files.

## One-time console steps

1. Firebase Console → project **vidyalaya-one-app** → **Build → Authentication →
   Get started → Sign-in method**. Enable **Email/Password** (not email link).
2. Authentication → **Users → Add user**. Create `ramsirkvs@gmail.com` with the
   password chosen by the Principal. If the account already exists, reuse it.
   Copy the account's **User UID**. Do not use the email as the UID.
3. Realtime Database → **Data**. Create `cbse`, then under it create `adminUid`
   with the copied UID as a **string**. This identifies the sole account allowed
   to read or write the private draft. Only the Firebase Console/admin tooling
   can change this setting; client users cannot assign themselves access.
4. Realtime Database → **Rules**. Publish the contents of `database.rules.json`.
   This retains the public application catalogue, allows public reads of
   `/cbse/public` only, and restricts `/cbse/draft` to the Principal UID. Other
   paths remain denied. If you have added unrelated rules, merge rather than
   overwriting those rules. Do not enable database-wide public reads or writes.
5. Authentication → **Settings → Authorized domains**. Add
   `vidyalaya-one-app.vercel.app` if it is absent. The app uses Email/Password,
   with sign-in retained on this browser/device until the Principal chooses Sign out.
6. Open the live **CBSE Board Examination** card → **Principal sign in**. Enter only the Principal password,
   then **Import private JSON** and choose the private 240-student import file
   supplied separately. Confirm **Replace private draft**. Alternatively,
   **Import CSV files** accepts all nine original CSVs together. Uploaded files
   are read in the signed-in browser and written directly to the protected
   Firebase draft; they must not be placed in the website repository.
7. Review the records and choose **Publish → Publish approved fields**. The public
   page then shows only name, roll number, class, section and stream. Open it on
   a second device to verify live updates. Private edits do not automatically
   publish. **Unpublish all** removes public records while retaining the draft.

## Captured data

| Class | Section | Students | Stream |
|---|---|---:|---|
| X | A | 24 | — |
| X | B | 27 | — |
| X | C | 24 | — |
| X | D | 24 | — |
| XII | A | 24 | Science |
| XII | B | 29 | Science |
| XII | C | 26 | Commerce |
| XII | D | 35 | Humanities |
| XII | E | 27 | Humanities |

Total: **240 students**, 99 in X and 141 in XII. The original subject headers and
individual choices are retained; a dash means not enrolled. Names are retained as
supplied. `SNo` is an import sequence, not a persistent identifier; roll numbers
are editable and must be unique within a section.

## Feeding workflow

- **Students:** add, edit, delete, search and move to another section within the
  same class. When moving, review the destination section's subject choices.
- **Sections:** add, rename, assign streams or delete. Deletion confirms removal
  of that section's students and subjects. Download a backup beforehand.
- **Subjects:** add/edit a name and optional code per section; deletion removes
  the corresponding student selections. Choices are edited on student forms.
- **Streams:** add, rename or delete. Deleting a stream clears its assignments
  while preserving sections and students. Class X can remain without a stream.
- **Import CSV:** filenames follow `Class_X_Sec_A_Students.csv` or the relevant
  class/section. Columns are `SNo,RollNo,StudentName` followed by subject columns.
  Matching rolls are updated, new rolls added, other existing students retained.
  Review the import summary before saving. Subject columns replace the imported
  students' subject choices; dash/blank means unselected. Malformed files and
  duplicate rolls within a file are rejected before anything is saved.
- **Import private JSON:** replaces the whole private draft after confirmation.
  **Download backup** exports the current private draft for secure local storage.
- Saves use revision checks; if another session edits the draft while a form is
  open, the older form cannot overwrite newer records. Reopen it and try again.
- **Publish:** creates a separate snapshot containing only the approved fields.
  Every connected public page listens for changes to that snapshot. Publishing
  a stale revision is rejected by database rules. No student subjects, passwords
  or private notes are included. School authorization and consent for publishing
  student names remain the school's responsibility.

## Password Settings

After signing in, choose **Password Settings** in the workspace toolbar. This
opens a separate Principal-only page with Old password, New password and Confirm
new password fields. It verifies the current password with Firebase, applies the
new password through Firebase Authentication, and keeps the current session signed in. Use the
new password the next time you sign in. There is no email field. The new password must meet
Firebase's account policy (at least 6 characters by default). No passwords are
stored in the database, source code or browser storage by the application.

Firebase Email/Password activation and the configured Principal UID above are
still required; the settings page cannot bypass an unconfigured backend.

## Validation and limits

The import/model checks and browser workflows were exercised with local mocked
Firebase services, including imports, all CRUD forms, publish/unpublish, search,
revision conflicts, sign-out cleanup, and layouts at 360, 768 and 1440 pixels.
The tests do not establish live Firebase authorization or rule deployment. Real
sign-in, enforcement, cross-device synchronization and Vercel deployment must be
checked after the console steps above. The rules have not been run against a
Firebase emulator in this environment.

The implementation covers basic student data only. Marks, attendance, reports
and other examination monitoring features are future work.

## Official Firebase agent plugin and CLI

Installed in this managed environment from the official current marketplace:

- Codex plugin: `firebase@firebase`, version **1.1.0**, enabled.
- Upstream revision: `09fe6d688e0f9d0ff73f141b8d12f4013b86e19b`.
- Firebase CLI verified: **15.34.2**.

To install in another Codex environment:

```sh
codex plugin marketplace add firebase/skills
codex plugin add firebase@firebase
codex plugin list --marketplace firebase
```

Use `codex plugin marketplace upgrade --help` for the installed CLI's marketplace
refresh options, refresh the Firebase marketplace, and reinstall/update the
plugin when a newer release is available. The project `AGENTS.md` records that
future Firebase work should consult the official skills.

`firebase.json` now declares Email/Password authentication and the existing
Realtime Database rules; `.firebaserc` selects `vidyalaya-one-app`. These are
configuration files, not evidence that the backend has been changed. After
signing in to the Firebase CLI securely in an interactive terminal:

```sh
npx -y firebase-tools@latest login --no-localhost
npx -y firebase-tools@latest deploy --only auth --project vidyalaya-one-app
```

The auth-only deploy enables Email/Password and does not disable other providers.
It does not create the Principal user, set its password, set `cbse/adminUid`, or
deploy database rules. Complete the console steps above for those requirements.
Do not paste CLI authorization codes, refresh tokens or service-account keys
into chat or commit them to the repository. Browser-side `createUserWithEmailAndPassword`
creates an Auth user only after the provider has been enabled; it does not enable
Email/Password or authorize that user as the Principal. Keep signup out of the
public Principal login page.

For an actual Auth SDK test using synthetic credentials, start the local Auth
emulator in a separate terminal:

```sh
npx -y firebase-tools@latest emulators:start --only auth --project demo-vidyalaya-one-app
```

Install the matching SDK in an external test cache, then run:

```sh
npm install --prefix /workspace/.cache/firebase-auth-sdk --no-audit --no-fund firebase@11.10.0
node tests/firebase-auth-emulator.mjs
```

`FIREBASE_TEST_SDK_DIR` can point to another directory containing that SDK's
`package.json` and `node_modules`. The test is fixed to the loopback Auth emulator
and a demo project, so it never creates accounts in the live project. Account
creation, login, wrong-password rejection, reauthentication and password changes
passed against Firebase Auth emulator/CLI 15.34.2 with SDK 11.10.0. Production
activation remains unverified: no Firebase CLI account was authorized, the MCP
connection timed out, and the environment's live Firebase network additions had
not been applied.

## Faculty feeding: Class X and Class XII

After Principal login, choose **Faculty & teacher roles** to open
`cbse-faculty.html`. Each standard has its own editable faculty directory and
section responsibility table. The page reuses the existing Principal session and
UID check. Faculty responsibilities describe school duties; they do not create
accounts or grant access to feeding pages.

### One-time activation and capture

1. Publish the latest `database.rules.json` in Realtime Database → Rules. The new
   `/cbse/facultyDraft` path is Principal-only. Previously published rules do not
   include this path, so the faculty page will report access denied until updated.
   Existing student rules, the Principal UID and data are retained unchanged.
2. In the protected faculty page, select **Import faculty PDF** and choose the
   original `faculty.pdf` supplied for this task. Review the import and click
   **Import faculty privately**. Both standards are filled in one operation.
3. The original PDF contains 51 roster entries, of which **15 teach Class X** and
   **14 teach Class XII**. Unrelated classes, evaluator/QP-setter names, Principal
   and other non-teaching roster entries are excluded. Vacant teaching positions
   are retained and marked **VACANT** rather than treated as filled posts.
4. The nine complete Class X/XII teacher/co-teacher pairs visible in the updated screenshot
   are applied only for the exact original PDF and only to empty assignments.
   **Class X-A uses the newly confirmed pair** from the complete screenshot.
   Existing records can be corrected using **Apply updated CT / Co-CT list**. Class XI screenshot rows are outside this workflow.

The PDF is parsed locally in the signed-in browser with PDF.js 4.10.38. It is not
uploaded to Vercel or committed to GitHub. Extracted faculty records and roles
are saved directly to the protected Firebase path only after confirmation.
The initial captured data is also retained privately in this task's workspace;
there are no faculty names in the website bundle. The public bundle stores only
an original-file digest and the screenshot's roster-number mappings.

### Ongoing editing

- Add/edit/remove faculty separately in each standard. Fields are name,
  designation, subjects/expertise, teaching sections and status.
- Class teacher and co-class teacher dropdowns save immediately after selection.
  Each section's two people must differ; one person may lead only one section
  within a standard. Co-class teachers can support multiple sections.
- **Other roles** allows up to ten named responsibilities per section, such as
  mentor or coordinator. These can be added, reassigned or removed.
- Inactive faculty remain in the directory but cannot be assigned. Deactivation
  and removal clear that person's responsibilities in that standard. The other
  standard is unaffected. Removal requires confirmation.
- Section names/availability follow the existing student draft. New sections
  appear automatically, renames preserve assignments through stable section IDs,
  and removed sections disappear from the responsibility table. Old hidden
  assignments are pruned on the next faculty save.
- Reimporting the same PDF preserves edited faculty and saved assignments. A
  different VEMS roster can add matching X/XII faculty, but screenshot defaults
  are never applied to an unrecognized file. The parser expects the supplied
  VEMS column layout and text-based PDFs, not arbitrary scans.
- Faculty writes use independent revision checks, so faculty editing does not
  overwrite students, streams, subjects or published student snapshots. Student
  backups/imports and student publishing do not include faculty records.
- **Download faculty backup** exports the private faculty state for secure local
  retention. The PDF can be reimported for initial capture; no automatic backup
  restore feature is included.

### Faculty validation

`node tests/cbse-faculty-model.test.mjs` runs seven model tests.
`python3 tests/cbse-faculty-browser.py` uses synthetic faculty, an actual generated
PDF parsed by PDF.js, and mocked Firebase to verify the protected area, standard
separation, vacancies, CRUD, role assignments, live snapshots, conflict handling,
repeat import, sign-out cleanup and layouts at 360/768/1440 pixels.
The uploaded actual PDF was separately parsed and checked against its 29
relevant entries and nine complete screenshot assignments. Live Firebase writes
and the new rules require console activation and were not verified by these
local browser tests.

PDF.js's Apache-2.0 license is retained at `vendor/pdfjs/LICENSE`.


## One login and automatic website updates

Firebase uses `browserLocalPersistence` in the shared client, so the Principal's
session is reused by Students, Faculty and Password Settings, across navigation,
reloads and tabs on the same browser/device. Password changes no longer force a
logout. Explicit Sign out still clears the session. Firebase may require a new
login if the account is disabled, tokens are revoked, or browser storage is
cleared; normal deployments do not intentionally sign out the Principal.

The Faculty activation screen now gives one linear sequence: **Copy rules → Open
Firebase Rules and Publish → Reload Faculty**. An authenticated Principal with
missing faculty permissions sees this setup sequence, not a misleading login
request. A clipboard fallback provides selectable rules if copying is blocked.
The existing rules still need to be published once by an authorized console user;
copying settings is not a backend deployment.

Vercel runs `node scripts/build-site.mjs`, which creates the `public` directory
from an explicit website-asset allowlist and adds an automatic content version.
Private imports, tests, agent instructions, development docs and Firebase config
files are excluded from the website output. Public database rules are included
for the setup copy button. Build output is ignored by Git.

`live-update.js` checks for a new deployment every 30 seconds and when the page
becomes visible. It reloads a new deployment while retaining the Firebase login.
An open edit dialog, entered password or pending save delays the reload until
it is safe. Saved records already update independently through Firebase listeners.
A page opened before this watcher was introduced needs one initial refresh.

## Faculty CSV feeding (no repeat Console visits)

After the one-time Faculty rules activation, all routine uploads and edits happen
inside the logged-in Faculty page. The CSV feature uses the existing protected
faculty path and schema; it needs no additional Firebase rule changes.

- **Import faculty PDF** captures the original PDF once. **Download faculty CSV**
  then saves the current X/XII faculty data to the Principal's device.
- **Convert PDF to CSV** creates a CSV directly from a selected roster PDF without
  changing database data. This is also available on the activation screen. It
  keeps the private records on the Principal's device until an import is confirmed.
- **Import faculty CSV** previews new/updated counts for each standard before
  saving to Firebase. Names and existing records match by stable FacultyID, with
  name/designation matching used when appropriate. Leave FacultyID blank for new
  faculty. Do not change an existing ID when renaming a faculty member.
- The columns, in order, are: `FacultyID,Class,Name,Designation,Subjects,TeachingSections,Status,ClassTeacherOf,CoClassTeacherOf`.
- Class is X or XII. Status is active, vacant or inactive. Separate multiple
  section names in the two role columns with semicolons, e.g. `D;E`. Sections must
  already exist in the student workspace. Blank primary-role cells clear the
  imported faculty member's previous class/co-class teacher assignments.
- Unlisted faculty are kept. To remove a faculty member, use Remove in the page;
  omitting a CSV row does not delete a person. Custom responsibilities are edited
  through Other roles and retained by CSV updates, unless the teacher is marked
  inactive. The JSON backup remains the complete export including custom roles.
- Malformed rows, duplicate records, unknown sections and conflicting role
  assignments are rejected before any data is saved. CSV operations are private
  and do not publish faculty to the student search page.

The original supplied data was converted to a private 29-record CSV and verified
to round-trip exactly, including all nine complete screenshot role pairs. It is
kept outside the website repository. Because chat workspace download links were
not usable for this user, the browser download/conversion buttons provide the
file directly on the user's device without publishing staff records in the
website bundle.

`node tests/cbse-faculty-csv.test.mjs` checks round-trip fidelity, name updates,
retention, role clearing, invalid input and spreadsheet-safe text. The faculty
browser test also verifies an actual download, CSV edit/reupload, and PDF-to-CSV
conversion without a database write.


## Mission Perfect 100

The CBSE portal tile now opens `cbse-mission.html`. See [MISSION_SETUP.md](MISSION_SETUP.md)
for the activated dashboard/profile workflows, rule deployment and secure PIN
service configuration. The existing student/faculty feeding pages remain linked
and reuse the same persistent Principal session.
