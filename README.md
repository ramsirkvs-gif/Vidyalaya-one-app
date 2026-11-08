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

Personalised student QPs: while preparing a paper, expand **Personalised student copies**, enable QR copies and select enrolled students (including Select all). Save the QP, then use **Print student QR copies** to print/save one combined PDF; QP Store also offers **Student QR copies**. Each answer block has an opaque QR linked to the saved QP and student, with no names in the QR payload. Evaluation’s **Scan student paper · QR + answers** accepts one photo, identifies class/QP/student/block and reads the matching circles. Review the large score, then Save score; the result offers Scan next student paper. Normal QPs retain manual QP/student selection. Staff access is still required, original PIN/Principal save checks remain, reprints retain identities, and deleted/reset QRs no longer resolve. Multi-block papers require a photo of each matching QR and answer block before saving.

The MCQ starting screen also offers **Quick evaluation · scan directly → Scan student QR paper** before class/subject fields. Photograph a personalised QR and its circles to fill class, subject, paper and student automatically. The ordinary class/subject activity buttons remain unchanged.

Evaluation results show the student name, class/section, roll number and large score. **Evaluation reports** filters saved results by class, subject, evaluator and date, links to individual academic progress, and prints a PDF. Principal can explicitly **Publish report to staff**; saving alone does not publish. Changed grades require review and republication. Reports remain staff-only.

**Scan QR → View answer key · PIN** identifies the saved personalised paper without saving an evaluation. Active staff must verify their personal PIN before the frozen paper answer key appears; the signed-in Principal uses the existing session. Keys are cleared when the dialog or staff view closes. The evaluation page also offers the same protected answer-key view for an ordinarily selected QP.

Linked questions use a separate CSV type in **Bulk upload CSV → CSV type → Linked questions**. Download its five-column template (Subject, Topic, SharedPassage, Question, CorrectAnswer); one file contains one complete set of 2–20 rows in question order. Put the common passage on the first row. Import validates the entire file and links the rows automatically. Selecting or removing one question includes/removes its full set after confirmation; random selection asks before expanding its count. Saved QPs reject partial sets, keep the original order, and print the shared passage once. Existing ordinary CSVs and saved QPs are unchanged.

**MCQ → Contributors · Class X / XII** shows separate whole-class current-bank summaries across all subjects, credited by contributor, with question and subject-wise counts. Each class has Print / save PDF and Copy summary (text download fallback). Deleted questions are excluded; no student details or answer keys are exported. Personalised QPs print student names and classes in bold 12 pt in the header and bold 11 pt beside the answer area; long names wrap within their field.

The protected staff question-bank page shows a **Correct answer: A/B/C/D** badge on every question. This explicit bank read exposes only the current question answer letter; QP selection, normal reads and printed/saved QP views retain their answer-free data. Saved QP answer keys keep their existing PIN protection.

After opening Mission Perfect 100, **Direct Scan for student specific QP** opens a dedicated student QR photo scanner without class/subject selection. Existing staff access and review/save checks still apply; ordinary MCQ entry remains available.

The Vidyalaya One launch page retains its original application cards. After opening Mission Perfect 100, its home navigation uses compact, wrapping buttons for Overview, Teacher-wise overview, Student-wise overview, Conversations, Team News, MCQs and Direct Scan.

The main Mission search searches across all classes and sections, clearing inherited profile/class/section filters. The result-page Class and Section dropdowns still apply explicit filters. Internal profiles and global results use the same saved student record, current academic status and graph.

Question-paper PDFs use as many A4 pages as needed; old 1/2/4 page caps no longer restrict saved or new papers. Every odd-length QP gets one truly blank final page for double-sided printing. Personalised batches apply this separately to each student, so a new student always starts on a fresh sheet. Content stays readable without forced shrinking. Print both sides and flip on the long edge.

The QP preview retains fractional **A4 used** (0.25, 0.5, 0.75, 1, 1.25…) and free-space feedback, and reports added blank duplex pages. Student-specific QPs have a prominent entry, an open student-category selector and a three-step question/preview/save guide. The saved-paper table supports General versus Student-specific filtering, assigned-student status and individual reprints. Print actions explicitly say **Print student-specific QPs / Save PDF** or **Print QP / Save PDF**. Reusing questions for other students creates new assignments/QRs; unassigned students and mismatched scanned identities cannot be saved against another student's paper.

The master launcher includes **Online Principal Chamber** immediately after SAMAGAM. It opens the portrait header, in-page Principal sign-in and staff-reporting workspace. Existing reporting and approval workspaces retain their original Principal session/PIN protections. The Principal photograph extracted from the supplied Word document appears on the tile and concept page.


Mission now loads its existing verified staff session independently of external Firebase SDK downloads. Search shows a loading/retry panel until records are available, retains typed queries, and never reports zero students solely because loading failed. Same-origin staff reads time out and retry, while expired sessions still require the existing staff password. Class-list search covers the whole roster while a query is typed; clearing it restores the class filters. Short name prefixes match immediately. Mission overview/search/MCQ pages share header, colours and compact navigation; the outer Vidyalaya One launcher is unchanged.

Mission reloads retain the current route instead of resetting to Overview. Active MCQ/news screens and local search filters are not rebuilt by background data notifications; other same-page refreshes retain scroll position. Existing MCQ subject/selection drafts restore on reload, including a startup upgrade from verified staff view to Principal. Deployment updates wait in active workspaces and offer **Update when ready**; unsaved forms and pending saves still block reload. Idle launch pages can update automatically.

**Remedial Class Manager** (Mission navigation, also the former remedial/timetable routes) has a compact scheduling form: teacher → assigned class/section/subject → existing student category/individual ticks → one day, daily working days, all-day date range or selected holidays → morning 07:30–08:30, afternoon 14:15–15:30 or manual/break time. The original 22 named 2026 holidays remain preserved. KVS_Complete_Holiday_List_2026-27.csv supplies the requested November 2026–31 January 2027 calendar, including all 20 winter-break days (23 December–11 January). January has winter break, Sundays and second Saturday only; GH/RH dates are not finalized. Undated Annual Day and Annual Sports Day are not scheduled. The selectable calendar merges those named dates with calculated Sundays and second Saturdays through 31 January 2027, includes winter break, deduplicates overlapping dates, and offers a holiday-type filter. Daily excludes Sundays, second Saturdays, winter break and GH; RH remains a working day; explicit holiday/range planning is available. One date range is one grouped plan, with no per-student/day records generated. Own PIN or Principal session is required to save/cancel. Student/teacher/exam/legacy timetable overlaps require explicit coordination acknowledgement and are rechecked atomically. This scheduling screen does not mark classes conducted or approved; existing remedial records remain readable.

Remedial plans can combine multiple assigned sections of the chosen class and subject. Additional-section ticks expand the category counts and student roster; the server rejects unassigned sections or another subject. One combined class still saves as one plan. Holiday mode goes directly to today/upcoming dates only, with no start/end range controls; the bottom holiday calendar also hides past dates (India time). Previously saved plans and the complete source calendar remain intact.

Remedial student selection includes **Manually select students**, which opens the combined assigned-section roster with no students preselected. Individual checkbox changes switch to manual mode, and adding sections retains existing manual ticks.

The remedial **Staff plan board** displays all teachers’ planned and cancelled classes. Principal saves/edits/cancels use the existing signed-in session with no PIN; teachers verify their own PIN and may manage their own plans only. Edit reuses the form and updates the same record, with revision checks and last-editor metadata. Cancel/delete removes the active booking but retains a visible cancellation notice with actor/time. Board-only refresh follows live/polled Mission data while preserving unsaved planner fields and expanded plan cards; staff polling continues for the board during draft entry.

Saved QP rows now provide **Create student-specific PDF** directly: select one or multiple sections (including other teachers’ sections of the same class), select students, verify personal PIN where required, and save a new assigned QP. The original saved QP is unchanged. Saved named QPs provide separate **Print all student-specific QPs / Save PDF** and **Print by student / Save PDF** actions. Explicit student-specific creation rejects an empty target roster; explicit general creation rejects student assignments. Section choices are validated against the selected class, and the learner must be enrolled in the paper’s subject.

Student-specific preparation selects the intended recipient list using section/category or individual checkboxes. Absentees are marked once, at the final assigned-paper print review, which provides **Print remaining students / Save PDF**, without mutating saved QR assignments or recording exam/remedial attendance. Counts show print, excluded and total students for the current scope.

Student-specific print actions first open a stable absentee-review dialog. Batch printing remains disabled until the teacher confirms the absentee list and print count. Changing a tick clears that confirmation. Absentee ticks update in place without replacing the roster or moving its scroll position. Closing the dialog cancels pending PDF preparation before the browser print dialog opens.

The ready-made QP store uses responsive paper cards instead of a wide action table. Each card puts QP type, class/subject, question count, evaluation totals and large Print / Save PDF actions first. Topics, usage lists, revisions and deletion remain under Topics, usage & manage QP. On phones the assigned-student print review also stacks student rows vertically, with individual print buttons and the reviewed batch-print footer visible without sideways scrolling.


Online Principal Chamber’s light-green **Roll Call** tile uses the existing staff viewing curtain. Primary and Secondary reporting are separate. The supplied 46-person Secondary roster keeps the stated order and excludes Principal, VP and vacant posts; known aliases combine multiple profile IDs in one row. Primary uses its existing directory. Opening a form requires no personal PIN. Every teacher submission, objection and NOC clearance requires a fresh personal PIN; cancellation preserves entered answers and saves nothing. The server-only `cbse/rollCall` branch remains denied to direct client reads/writes by the existing default rules.

The **Principal Sign-in / Dashboard** button is in the Chamber header. It signs in with the existing Vidyalaya One password-only Firebase account and checks the configured Principal UID on the server. It reuses the shared persistent Principal session, refreshes ID tokens for protected calls, and clears protected views/PINs on sign-out or a shared-session change. No signup or separate Principal password is introduced.

On Principal entry, `roll-call-setup` idempotently creates missing staff-reporting profiles for the supplied Secondary list, without inventing class/subject assignments. It then generates distinct three-digit PINs only for active reporting staff who lack a PIN. Existing hashes, salts, encrypted display values, PIN versions and disabled access are retained. New PINs avoid already-readable existing three-digit PINs. The same `cbse/staffAccess` records serve Mission 100 and Chamber submissions. Actual production generation runs after successful Principal sign-in; it does not run in the public browser or during a build.

The protected dashboard provides **Pending approvals**, **Approved**, **Not approved**, **IC Objections / NOC**, **Staff list · both wings**, and **PIN list**. Staff add/edit uses the existing complete faculty/support editor inline, retaining assignments and existing PINs; a reporting-wing choice is available for support staff. The PIN list is fetched only in the protected tab, masks values initially, and offers explicit save/replace or disable actions. A PIN whose older encrypted display value is unavailable is retained, not silently reset. `roll-call-context` supplies the editor’s staff/assignment context without student rows; both context and setup require Principal UID verification.

Reporting begins with **1. Are you on leave?**. Only Yes reveals leave-period choices and the pre-approved Samagam leave-PDF reminder. First-half leave permits afternoon reporting only and does not require a morning report; second-half leave can be recorded in the morning. A submitted long-leave range removes the teacher from both RC selections, the daily register and missed-report totals for the inclusive interval. The server blocks RC submissions during it; names return after the end date. The Principal list retains leave records. Reporting date and submission timestamp are server-authoritative; past/future reporting dates are rejected. The retained live clock, last-response confirmation and register timestamps use **DD/MM/YYYY** and IST.

The duty checklist asks about biometric attendance, the staff register, assigned duties, checking the Vidyalaya timetable app, Samagam login/data updates and reading WhatsApp instructions for compliance. Actual No answers require a reason before the submission PIN; every popup item says **Your answer is NO**. Reasons have a live word counter and a 100-word maximum (50–100 suggested, at least 10 characters). No-leave and not-applicable duty choices do not imply a failed duty. Both all-Yes and No-containing RC reports await explicit Principal approval. Declined reports say **Not approved — please discuss with the Principal**; teachers may resubmit after discussion. Approved afternoon rows remind teachers to complete biometric sign-out and sign the staff register before leaving. These are reminders, not device verification.

The wing-scoped status register includes serial numbers, names, designations, morning/afternoon status, submission times and expandable details. Golden/blue belts show period totals. **Refresh status** fetches decisions without background replacement of an active form. Other staff’s status summaries remain available after a submission, without exposing their private answers or reasons.

**IC Objection / NOC** has an independent coloured box: choose IC name → choose All teachers, recorded CTs/Co-CTs, or individual ticks → enter a short remark → Raise objection. The selected IC is excluded from targets. No repeated wing or mandatory department field is shown. Only the author or Principal can remove an objection and release NOC. Open objections block afternoon clearance only; a new objection invalidates existing afternoon clearance, and a teacher resubmits after NOC. CT/Co-CT shortcuts use saved faculty role assignments; no Primary roles are inferred from a designation alone. There is no separate IC-appointment registry.

Master application tiles use one continuous coloured surface. Preview images are inset thumbnails beside titles, without a separate edge-to-edge white image band; mobile cards keep the same unified background, full descriptions and large entry links. Principal Chamber retains its portrait and place immediately after Samagam.


Principal Chamber **Reporting setup** supports a private draft and separate published form: edit the teacher tile title, show/hide the reporting area, add/delete/reorder duty questions, choose Yes/No, Yes/No/Not applicable, or short-text answers, and set required questions. Preview does not submit data. Only Publish changes teacher-visible titles and questions. Leave routing, submission PINs, server timestamps and Principal approval remain protected. Every new RC stores its form title/version and question snapshot; publishing does not rewrite old submissions. The server checks the published form/version and saves the RC in one root transaction, rejecting stale forms rather than accepting mismatched answers. Existing default Roll Call remains the initial published form.

**Principal’s Podcast** has a separate teacher tile and a protected authoring tab. Principal pastes a YouTube or Google Drive video link, selects teachers/wing/recorded CT-Co-CT groups, saves a draft, previews or publishes. Draft edits do not alter a live video until published. Published updates start a new acknowledgement round; earlier acknowledgements are retained by version. Unpublish removes teacher access, and Delete hides the post and clears that video’s acknowledgement records and published pending list. A replacement video starts with no report submitted, including when it reuses the same link. Other videos’ reports remain unchanged. The server accepts supported YouTube and Google Drive file links. No video files are uploaded to the portal database.

Teachers first browse published video cards and permitted recipients behind the shared staff curtain. Compact video rows show a small icon, short details and recipient information. A single recipient name is shown directly and clicking asks only for that recipient’s Mission 100 or other assigned PIN. Group videos ask for name then PIN, retrieving only assigned published videos. Verified playback expands in the existing preview slot; it does not leave a duplicate preview or add a separate video frame. Close video restores the small icon. PINs are not retained after verification. The compact, uncropped YouTube privacy-enhanced embed uses official iframe API controls with portal Play/Pause buttons and no separate Share/Open YouTube links; YouTube may still show its own overlays. SDK loading is deferred until preview/watch, and players are destroyed when removed. This reduces easy sharing; it is not DRM or a guarantee against extracting an unlisted link.

A teacher explicitly confirms **I have comfortably viewed the video and noted all instructions**, has no optional remark field, and verifies the PIN again to submit. This is a self-reported acknowledgement, not proof of complete playback. The server rechecks recipient assignment and published version, timestamps the acknowledgement, and prevents cross-teacher writes. Principal sees assigned/acknowledged/pending counts and named statuses for the current published version. The staff catalogue returns published titles, notes and permitted recipient names; it does not return YouTube URLs, video IDs, private drafts or acknowledgements. Content APIs use the existing staff curtain and Principal UID checks; new database branches remain covered by default-deny client rules. All existing staff PINs remain unchanged.


New MCQ preparation uses one student-specific workflow: **1. Choose subject-mapped sections and students → 2. Select questions → 3. Preview/save and choose the print format**. The general/student-specific preparation toggle is hidden and locked on; saving requires selected students. Only sections with an explicit mapping for the chosen subject are offered, and named-paper saves validate this mapping on the server. Teacher identities/subject choices, linked sets, saved question drafts, reuse checks, page setup and evaluation remain available.

Recipient selection supports cumulative section/category checkboxes (for example XII-A critical + XII-B critical), using the existing academic bands and deduplicating overlapping categories. Manual mode opens one consolidated subject-enrolment list across chosen sections. Individual ticks update in place. A visible Save-area message explains missing targeted students or questions; waiting for selection does not use a wait cursor. Absent-student exclusions are handled only at the final batch-print review, which still requires explicit confirmation. Revising a saved QP restores its named assignments in manual mode; a new other-student PDF starts with a fresh recipient selection.

The final print chooser has **Student-specific PDF / Print** and **Normal QP for photocopying**. Named printing retains unique QR copies and the explicit absentee/count confirmation. Photocopy printing renders an unnamed, QR-free master without changing the saved named QP, assignments, tokens or evaluations. Existing general QPs remain readable and printable; they are not deleted or silently converted.

Principal Chamber now opens with no reporting form or approval queue selected. The V1 brand returns to the application catalogue. The header tracks the existing shared Firebase Principal session and offers explicit Sign out, including after returning to the Chamber. Sign out clears protected UI and rejects late responses from the previous session; it does not reset Mission 100 PINs. A new device needs its own first password sign-in.

The staff podcast catalogue lists only published video titles, guidance and permitted teachers, with a decorative blurred locked frame before name/PIN verification. YouTube IDs, URLs and acknowledgements remain behind the existing personal PIN check. All-teacher versus selected-teacher audiences are explicit at publication; assignments are a snapshot of the selected staff. Principal published-video cards offer direct playback independent of draft preview. Automatic captions are disabled through supported YouTube player settings; text recorded into a video remains part of the video. Chamber staff selectors follow PGT, TGT, PRT, then other staff, preserving the supplied Secondary order within each group. The full Primary roster is still pending and the dashboard displays that reminder.

Inside **Roll Call**, staff can open **Pending Roll Calls — check your name**, a read-only list behind the existing staff viewing curtain. There is no separate Pending Roll Calls tile. Teachers can check their name across both wings and Morning/Afternoon RC, with separate missing-submission and submitted/Principal-approval-awaited lists. It uses the existing canonical roster and leave exemptions, excludes unlinked profiles, shows the current server date, and supports name search, wing filtering and manual refresh. No Principal login or submission PIN is required to read it; Principal approvals remain in the protected dashboard.


Opening either tile with the existing verified Principal session opens its corresponding management workspace. Podcast management shows published videos first with a visible assigned-teacher table, report-submitted/pending status, statement and submission timestamp; no teacher PIN prompt or viewing-report checkbox is shown to the Principal. The public staff catalogue remains PIN-gated for playback. Each published video has **Publish pending list**, **Update published pending list** and **Hide pending list** controls. Only an explicit Principal publication exposes a snapshot of pending recipient names; current acknowledgements remove names from subsequent catalogue reads. No private acknowledgement text/timestamps are published. A new video version requires publishing a fresh pending list.

Teacher playback displays **Viewing report**, the required “I have comfortably viewed the video and noted all instructions” checkbox and **Submit viewing report** before **Close video**. Closing without submission points to that report and offers **Close without reporting** for unfinished viewing; it never fabricates an acknowledgement. Submission still requires the teacher’s existing assigned PIN.


Roll Call entry now recognizes the shared Principal session too. Principal sees approvals, **Not submitted today** and **Edit questions / title** under the single Roll Call workspace; missing-submission lists say **Search staff**, never “check your name.” Staff receive their normal reporting form and a pending-name list inside Roll Call. Question editing supports adding, editing, deleting and reordering duty questions, saving a private draft, previewing and publishing to teachers.

Principal navigation now has separate **Roll Call**, **Principal’s Podcast**, and Principal-only **Settings** tiles. Each opens only its own controls; returning to the Dashboard shows the entry tiles without a duplicate Chamber heading or cross-workspace menu. Settings contains Staff / Faculty and Shared PINs. Topic clicks queue while an operation is finishing and queued navigation is cancelled on sign-out.

Settings reads existing Mission 100 records and groups linked staff profiles into one person row. Adding a person already present in Mission 100 is rejected, including known name aliases and attempts to add faculty again as support; use Edit to extend the existing teacher’s standards and assignments. Explicit shared-PIN replacement updates linked active identities atomically, preserving separately disabled access and other staff PINs. Shared disable blocks linked identities. Missing linked profiles inherit the existing distributed PIN/hash instead of getting a separate random PIN; existing credential records remain unchanged. Teacher viewing-report controls sit directly below Play/Pause and remain present even if the player SDK fails. Principal logout clears private access without showing a logout-success message in the staff/public view.

MCQ preparation now separates **Students selected** (green, with eligible count and section totals) from **Questions selected** (blue). The question-clear action explicitly says **Clear selected questions**. **Refresh student data** reloads current roster/results while keeping the working QP and valid student selection; it does not reload the document. Code-update notices are sticky and explain why an active/unsaved workspace waits before loading a newer deployment.

Staff Roll Call opens with an IST morning/afternoon/evening greeting, today's reporting purpose and three short reporting steps. Pending names sit in a secondary optional disclosure. Before afternoon submission, the form rechecks IC objections and opens a pending-task/NOC dialog before requesting the submission PIN; answers stay in place. The server separately enforces clearance across linked identities. Principal IC monitoring can show open objections, released NOCs or all records, including the reporting IC and timestamps.


QP preparation keeps the large selected-student total and **XII-A + XII-B** section breakdown in Step 1. The question count and topic totals appear in the question-making area, below the topic/contributor controls. Contributor checkboxes are fully expanded. Question/code search remains in See Bank only. Preparation offers **Select all** or **Select manually**; the random-number selection UI has been removed. Existing reuse warnings, saved assignments, QR copies and final print review are retained.

The movable question-selection header mirrors the PDF preview’s live A4 status: used pages, remaining space, PDF page count, blank duplex pages and long-edge printing instructions. Selected-question code/removal controls are inside the same sticky header, so changes can be made in the question-selection area and immediately remeasured. The full PDF preview remains in Step 3.

Saving a QP without targeted students opens **Please select the targeted students first** as a modal popup. **Select students** returns to Step 1. The popup appears before submission/PIN validation and preserves the entered PIN and selected questions; the backend still requires recipients before creating a student-specific paper.


The MCQ entrance keeps one primary Create student-specific QP belt; its duplicate menu row is removed. See Question Bank explicitly covers adding one question, editing questions/answers and deleting questions. Ready-made QPs remember the already selected teacher, class and subject, and default to that teacher’s saved papers (including linked class identities). The Prepared by selector offers **All contributors** to widen the view explicitly. Creator filtering happens before saved-paper pagination and topic counts. Question selection uses three full-width strips: **Select all questions from this topic**, **Select questions one by one from this topic**, and **De-select all questions**. Deselection clears questions while keeping student targets.

Selecting **All students** in a section clears and disables the other category ticks until All students is unticked. Previously-used-question warnings exclude deleted QPs; retained archived records do not trigger reuse warnings.

Teacher profiles show **MCQ tests evaluated & reported**, using saved Mission MCQ results and their recorded evaluator IDs across linked teacher profiles. Totals include question papers, student evaluations and distinct students, with per-paper student scores and IST reporting dates. Corrected results count once; zero scores count as participation, absent results do not. No credit is inferred from the teacher name or subject assignment.

Podcasts accept YouTube links and Google Drive file-sharing links in the Principal editor. Drive file IDs (and resource keys when present) are stored as references; video bytes remain in Drive. Public catalogues omit playback identifiers, while the existing teacher PIN check returns the assigned video's source. Drive uses its native preview controls, with the app Expand/Exit control and existing versioned viewing reports. Its sandbox blocks new windows, top navigation and downloads; the preview must remain interactive to play. Set Drive General access to Anyone with the link / Viewer. This grants access to anyone who obtains the link, independently of app assignments; Google processing, playback quotas and sharing restrictions still apply. No app change makes a restricted Drive file public.

Drive videos open directly in the app's expanded view after PIN access, with **Back to report** returning to the viewing form. Browser/phone Back closes expansion before leaving the current page. Automatic expansion uses an in-page full-area layout because browser fullscreen requires a fresh user gesture. Drive's own embedded playback controls, timeline and skip actions cannot be individually disabled by the app; reports remain teacher declarations, not proof of full viewing.
Drive embeds deny nested browser fullscreen; rotation and expansion stay in the app layout. This avoids competing app/Google fullscreen modes, but mocked browser tests cannot establish whether a particular Android device's Drive rendering issue is resolved.
Drive preview uses a fixed 1280×720 internal viewport, centered and scaled to fit the available video area. ResizeObserver and viewport/orientation events update only the presentation transform; they do not replace the iframe or restart playback. This addresses cramped touch-player controls in short landscape viewports. Mobile tests check the stable internal dimensions, letterboxing, real scaled pointer coordinates, and unchanged iframe state across rotation; actual Google Android rendering still needs device confirmation.
