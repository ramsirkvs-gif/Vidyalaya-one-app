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

Choose the class first. Each class has its own subjects, eligible subject-teacher dropdown and shared question bank. Use the coloured Contribute button to paste 10/20 prepared MCQs, use complete question photos directly, or extract book-photo text into an editable notepad with local English/Hindi OCR, tap A/B/C/D correct answers and confirm submission with a personal PIN. Paper preparation offers topic/ID search, question checkboxes and a running 10/20 selection count. Any eligible teacher can reuse the bank for answer-free A4 papers and reviewed evaluation saved to academic performance. The Principal can open MCQ directly from their workspace and contribute under the authenticated Principal session; staff use personal PINs. Topic lists come from contributions rather than built-in syllabus presets. Later CSV uploads ask whether unfamiliar names should merge with existing topics or be approved as new. See [MCQ_SETUP.md](MCQ_SETUP.md) for details, private storage and validation.

Principal MCQ bulk CSV uploads accept up to 999 rows and 2 MB per file. In the selected class and subject, choose **Credit contribution to**: **My contribution (Principal)** or an active teacher/team member. The bank shows the credited contributor; the private upload record retains Principal as uploader. The same credit choice is available for new single-question contributions. Existing duplicate questions keep their original credit. Question codes retain the 999-code capacity per subject code. CSV previews show the first 50 rows; all rows are validated and imported.

Bulk MCQ import skips repeated question text within the selected class and subject, including repeats under different topics or with extra whitespace. It checks existing text questions and repeated CSV rows, preserves original credit, and shows a popup with skipped/new counts. Conflicting answers stop the import for review. Re-uploading a CSV does not create duplicate questions.

In Principal question-bank view, **Change contributor / delete batch** filters the selected class/subject by current contributor, contribution date (India), or question code. Preview the matching questions, then assign credit or confirm deletion. Individual question menus also offer **Change contributor**. These operations retain private history and original uploader, preserve permanent IDs and saved paper/score snapshots, and reject changes if the bank changed since preview.

Contribution dropdowns are limited to teachers for the selected class and subject, including saved cross-class teaching assignments; Principal retains **My contribution (Principal)**. Printed QPs and saved-paper previews use a compact **combined writing blank and A–D circle strip at the end**. Printed QR codes are removed; evaluation loads the unique QP code. The existing scanning response strip remains available, and A4 layout measurements include the writing space.

Principal contribution management opens with selectable upload history for the chosen class and subject. Each row shows India date/time, current credited contributors, original uploader where recorded, topics, available/deleted counts, and a **Select / preview** action. A CSV spanning several topics stays one upload; separate uploads on the same day stay separate. Deleted uploads remain available under **Show deleted uploads**, hidden by default. QP preparation also offers checkbox filters for one, several, or all actual bank contributors; changing filters keeps ticked questions in the final selection.

Principal **Bank → More → Reset ALL MCQ data** previews totals for all subjects in X and XII, including questions, contribution batches, QPs, evaluations and linked MCQ scores. Type **RESET ALL MCQ** to delete all MCQ question banks, contribution/edit/deletion history, old bank archives, saved/archived QPs, evaluations, generated MCQ exams and linked MCQ marks. Question and QP codes restart from 001; old open forms and question selections are invalidated. Other academic marks, students, faculty, news and conversations remain. Only a compact reset audit containing counts and timestamp is retained; previous question content is not copied into another archive. Opening the preview does not clear live records.

Evaluation shows a **Loaded QP details** card with code, developer, class, subject, topic counts, total questions/marks and saved sections. Changing the entered code clears the previous marking form; missing or mismatched papers cannot leave an old paper ready for marking. The final review checkbox covers QP details, student and responses. The PDF header lists **Topics: Name (question count)** in small text, above the single-line student identity fields.

QP creation checks selected questions against the **Prepared by** creator's earlier papers, including archived QPs. A popup lists QP codes, dates and saved sections, with **Skip repeated questions** and **Use again** choices. Changing creator or restoring selections triggers a check before generation; newly recorded prior uses trigger another warning. Paper usage lookup returns metadata only, without answer keys. Stored QP rows show class, subject, question count, creator/date, saved topic counts, per-section evaluated/remaining counts and expandable student lists with scores and evaluation dates. Usage means saved evaluation, not viewing or printing a PDF.

During QP preparation, selecting a topic also shows saved QPs covering that exact contributor-saved topic in the same class and subject. Mixed-topic papers are labelled and show topic counts. All topics restores all papers for the subject. A compact preview shows the latest five matches with view/PDF actions; **Open QP Store** carries the topic filter to the full paginated store, which has its own **Topics covered** dropdown. Topic changes and store navigation preserve the selected question draft.

QP preparation uses a fixed default A4 layout with no print-settings form. The selection header keeps total/topic counts, measured A4 usage and a **Preview selected questions** button. **Save QP & preview** stores the paper and assigns its evaluation code; the preview then shows that actual saved code prominently. Changing the selection returns to an explicitly unsaved preview. Four unambiguous A–D option lines in text questions are automatically arranged as four, two or one option per row (never three plus one); original saved text, maths, images and ambiguous option formatting remain intact. Long options wrap naturally. Existing saved-paper layout settings remain supported internally.

The start menu now orders activities as **1 Bank → 2 Prepare QP → 3 Ready-made QPs → 4 Evaluation**. Topic selection offers **Select all** across every page or **Add random questions** with a requested number, respecting the topic/contributor choices and preserving prior ticks. Previously used questions still pass the reuse warning. Printed headers list the credited contributors saved on all selected questions in small text, separately from the QP preparer. Combined answer strips place a writing blank beside each question number before its A–D circles, preserving the original circle coordinates and four scan markers.

The question-bank browse screen now also exposes **Questions by contributor** (one, several or all contributors). Its text search accepts contributor names as well as question words and codes, within the selected class/subject and topic/filter scope.

Bank and QP preparation filters include a **Topic question totals** side box: the full active count for the selected topic and class/subject, plus each credited contributor's count. Search and contributor choices narrow the question list but do not hide the full topic breakdown; a note reports the filtered list count. All topics shows subject-wide totals. The box sits beside filters on desktop and stacks below them on mobile.

Topic names now ignore spelling-neutral differences in case, spaces and dash characters for grouping/filtering. New single-question topics warn about close spelling matches; CSV uploads show **Verify CSV topics** for names outside the listed choices, suggesting existing names and requiring explicit approval of genuinely new ones before import. The preview shows the verified names; server import applies the same mapping. Principal **Bank → More → Merge duplicate topics** previews and merges an old label into an existing topic, retaining question IDs, text, keys and contributor credit. Aliases keep old QP topic metadata and future CSV variants aligned with the corrected name.

Topic selection now reads **Select all from this topic** or **Select only [N] questions from this topic**. Select only chooses N randomly for the current topic, replaces its prior topic selection and preserves questions from other topics. The selection summary sits beside the preview, with one automatic A4-usage line above it. Fractional usage (0.5, 0.75, 1, 1.25…) is measured rather than selected; no page-size selector or print-settings form is shown.

Random **Select only N** now prefers questions absent from that creator’s earlier saved or archived QPs. The creator name must be chosen first. If unused questions are insufficient, the repeat popup explains the available unused count: **Skip repeated questions** keeps the smaller unused set; **Use again** can fill the requested count from earlier questions. Contribution history hides fully deleted uploads initially; **Show deleted uploads** reveals them and **Refresh history** reloads records without erasing history.

Random topic selection now prefers questions absent from the selected creator’s earlier QPs. When too few unused questions exist, the popup states the shortage and offers skip/reuse explicitly. Deleted contribution uploads are hidden initially and can be revealed with **Show deleted uploads**; refresh reloads that view without erasing records. A complete MCQ reset clears uploaded topic data and mappings; no built-in chapter list is restored.



Topic workflow: no built-in MCQ topics are offered. The first CSV establishes the subject’s topic names. On subsequent CSV uploads, unfamiliar names prompt the Principal to merge with a saved topic or approve as new. Existing questions and explicit topic merges are preserved.
