# Mission Perfect 100 — activation and use

## Attendance registers: cumulative totals and optional details

Principal controls → **Import attendance PDFs / JSON** reads one or more monthly
registers privately in the browser. Review matched students, duplicate rows,
extra names and cutoff coverage, then Save. The existing Principal session and
revision checks protect the write; no new Firebase setup is required. Files and
student import packages must stay outside source/build output.

Records match the final roster by class, section and normalised full name. PDF
roll numbers do not replace the portal roll/identity. Duplicate register rows
are ignored; conflicting duplicates are rejected. Extra names are excluded and
flagged as possible TC cases for review, never automatically marked TC or added
to the final roster. Later uploads of a missing section fill its gap without
replacing other sections; coverage counts distinguish the current upload from
all saved registers.

The profile header uses the latest supplied register: **Attendance till 31 Oct
2026: 112/120 · 93.33%**, for example. Individual denominators and arrears are
preserved. Present includes P, ML and O/D as defined by the source register;
H/S are non-working days, and leave/absent are not silently converted to present.
Daily cells, monthly totals, previous totals, arrears and printed percentages
must reconcile before import. A missing latest register is clearly labelled.

**Attendance details · month-wise** expands the actual uploaded monthly totals,
source arrears, cumulative figures and daily entries. A previous-month aggregate
is labelled combined; it is not divided into invented individual months. New
months retain earlier reports. Official registers are kept in
`mission.attendanceRegisters`, separate from manually entered daily attendance
and older Samagam percentages. Register totals drive the attendance percentage
and attendance band; academic colours continue to use marks. Staff can read
these details after the remembered curtain without entering a personal PIN.

## Latest progress, attendance and XII stream groups

Monitoring now always uses the latest recorded result per selected subject. The
class exam dropdown and academic month dropdown are removed; old exam URLs do
not change the latest report. Student graphs still show the journey from the
beginning. The latest subject table includes change since the first appeared
result, and full examination/monthly tables are retained under optional history.
An absent latest result stays AB rather than falling back to an old pass.

The supplied academic package contains cumulative workbook attendance for all
240 students. Imports store it in `academicAttendance`, separately from the daily
`attendance` register. Student headers show the workbook percentage, session and
source period when available, and separately show daily-register attendance only
when real dated entries exist. Zero daily entries no longer hides a supplied
workbook figure. A workbook percentage is never expanded into invented dates.

Student identity/CT team and contact/call/map panels use two equal columns on
wider screens and stack on phones. Comment cells and their text areas are compact.
The Principal comment cell now includes a password sign-in form in place, using
the existing Firebase account and persistent session. The configured Principal
UID is still checked; this is not a teacher PIN or a new login system. Successful
sign-in retains the teacher report, selected student and page location. Passwords
are cleared after each attempt and never saved by the application.

Class XII uses the Principal-confirmed section grouping: **Science A/B**,
**Commerce C**, **Humanities D/E**. Stream tiles show student counts and lead to
the relevant sections. An individual section displays its fixed stream, without
a redundant dropdown. Academic analysis and the teacher directory use the same
groups; teacher stream filters follow actual subject/CT duties or explicit
teaching-section metadata. This display mapping does not alter stored subjects,
marks or student identities.

## Touch reports and comment cells

Teacher profiles now use report tiles instead of the Review role dropdown:
**CT / Co-CT**, one **Subject teacher** tile per allocated section, and a
**Combined** tile when the teacher covers multiple sections. A CT with two
subject sections therefore has four tiles. Tile changes reset the colour filter;
student reviews remain inline and retain the selected report after a submission.

Above each filtered teacher list, a section breakdown shows the matching count
and population for every section, including zero matches. For example, eighteen
borderline students across XII-D and XII-E can be shown as XII-D: 8 and XII-E: 10.
Each section list repeats its own listed count. Population denominators use
smaller text; the main performance counts remain prominent.

Both Principal and teacher comment cells are visible together in teacher
profiles, student profiles and inline student reviews, with one shared thread.
The Principal cell requires the existing Principal sign-in. Staff see that cell
as read-only and use their own teacher cell with a fresh PIN to submit. Replies
to reporting requests target the visible teacher composer; no identity toggle or
extra sign-out is required. Teacher profile headers include a comments shortcut.

## Master Overview and compact review layout

A browser refresh opens the master **Overview** while keeping the remembered
staff curtain and Principal authentication. The two main choices are
**Teacher-wise overview** and **Student-wise overview**, each followed by X/XII.
Header shortcuts and Back provide navigation within Mission. Direct student and
teacher links still work when first opened.

Criteria, compact parallel CT/Co-CT section teams and a short scrolling subject
teacher list appear above the student filters. Student/Girls/Boys buttons filter
the cohort; colour tiles then filter that selected cohort. Their denominator
follows the cohort and stream/subject selection. Gender cards keep the original
population total so staff can return to all students easily.

Teacher reviews open the selected student inside the teacher page. **Back to
teacher list** closes the review without losing its report choice, stream or colour
filter. Header Back closes an open review first. PIN submissions and refreshed
server data retain this teacher context. Academic-dashboard selections are also
remembered during navigation in the same visit; refresh deliberately resets the
navigation to Overview.

Student tiles list every critical subject and separately list other failing
subjects. If there are no failing subjects, the tile labels its lowest recorded
subject explicitly. A single subject name is no longer used as an unlabeled
example of the student's worst band.

**Subject progress** shows one subject's percentage across months. **Monthly
consolidated progress** is total marks divided by the total maximum of appeared
papers for that month. Compare appeared/expected coverage and subject statuses
alongside the consolidated trend; AB and missing papers are excluded from its
percentage. A one-subject review shows a single graph because these two trends
would be identical. Plain-language explanations appear next to the graphs.

## Students and Teachers zone

Mission Perfect 100 (CBSE X & XII) now uses a Students path and a single Teachers
zone. The role/status dropdown opens a teacher's CT/Co-CT responsibilities,
allocated subjects and relevant students together. Teachers with the same exact
saved name and designation across both standards share a review view; each PIN
still verifies its own saved identity. No assignment is made from a name alone.

Large statistic buttons filter the student list. **Total fail = Critical fail +
Fail (excluding critical)**; the combined tile overlaps those two counts. Teacher
subject totals count each enrolled student once across that teacher's sections,
using only their allocated subjects. Lists are ordered X-A, X-B, and so on.
Opening a student from subject review scopes marks, graphs, status and remarks to
those subjects. Opening the ordinary student profile shows every selected subject.
XII stream filters apply to student lists and academic statistics. The same saved
gender data is projected to remembered staff views and Principal views.

Missing CT pairs are resolved from the previously approved screenshot only when
both original roster IDs exist and no saved role entry overrides them. Older
section-name role keys are resolved to the current section IDs. Missing subject
allocations can resolve from the exact original roster when a teacher has one
subject, explicitly teaches that section, and is the unique matching active
teacher. Saved assignments take priority. Mixed-subject, vacant or ambiguous
allocations remain explicit for Principal confirmation.

Student and teacher profiles end with a single comment thread. Teachers reply
with a fresh PIN; Principal remarks use the existing Principal session. A teacher
profile reply can satisfy only its linked public Principal remark and must use a
verified identity for that teacher. Pending student requests and Principal
comments are highlighted on the teacher profile. Legacy monitoring data is retained;
extra task/remedial/register controls are removed from the normal profile flow.

## Current simplified staff workflow

This workflow supersedes earlier descriptions of a separate PIN login and
assigned-student list. Keep the existing Firebase credential and rules; this
update needs no additional Console setup.

- On the first Mission visit in a browser/device, enter the shared staff curtain
  password. A secure HttpOnly cookie remembers access with a rolling 400-day
  lifetime. Clearing browser storage or choosing **Lock staff view** requires
  entry again. The password verifier stays on the server; no plaintext password
  is shipped in the browser bundle.
- Browse X/XII → section → student, search by name, or open Teacher monitoring.
  Full academic history, colour criteria, percentages, student denominators,
  contacts, call links, locations and general remarks are available without a
  personal PIN. The old staff URL redirects into this same view.
- Submit remarks, requested reports or contact/location updates from the student
  profile with the teacher's name and a fresh personal PIN. No PIN is remembered
  and no separate staff login/list opens. CT and subject roles are checked against
  saved allocations. Principal submissions use the existing Principal session.
- Principal can request the CT, all subject teachers, or an individual teacher.
  Missing subject allocations can be confirmed inline. Vacant/unassigned subjects
  remain explicit and are excluded from teacher response counts. A matching
  teacher/role/subject reply changes **Teacher has not reported progress** to
  reported and completes its linked report task. An unrelated remark does not.
- The shared read-only API validates the remembered session on every call. It
  excludes PIN secrets, restricted counselling records and edit histories.
  Browsing polls revisions every 20 seconds and fetches a compact full-history
  snapshot only when data changes. Principal controls retain their live Firebase
  subscriptions and authorization.
- Existing data and incremental Samagam exam imports are retained. Percentage
  criteria and colour explanations remain visible in student monitoring.

## Updated teacher pairs

The complete screenshot supplies all four X and five XII pairs. X-A is now
captured from that screenshot. The role defaults use original roster identifiers,
not public hardcoded staff names. In Faculty feeding, **Apply updated CT / Co-CT
list** previews and saves the corrected pairs to existing records using revision
checks. Other responsibilities are retained. If original faculty IDs are missing,
that section is reported rather than guessed. The updated PDF conversion and
private CSV capture include all nine pairs. XI screenshot rows remain outside
the requested X/XII scope.

## Principal activation

1. Let Vercel deploy the GitHub update. The project now uses the Firebase Admin
   SDK dependency for its serverless staff-PIN endpoint; Node 22 is declared in
   `package.json`. Vercel should install from `package-lock.json`, then run the
   existing build script.
2. Open **Mission Perfect 100** while signed in. The Principal session is reused.
3. If its setup panel appears, use **Copy rules → Open Firebase Rules → Publish →
   Reload Mission**. The new `/cbse/mission` workspace is Principal-only and has
   version/revision and threshold validation. Its monitoring modules share that
   protected workspace so ordinary new monitoring fields do not need a new
   Console rule for each feature. The existing student/faculty paths are retained.
4. Students and faculty are read from the existing private drafts, without
   reimporting them. Monitoring starts empty: no marks, attendance, gender,
   contacts or activities are invented. Add tests, enter real records and set
   academic/attendance thresholds before interpreting the dashboard.

## Working areas

- **Class X / XII zones:** sections, student strength, known gender counts,
  Red/Yellow/Green/Not assessed summaries, and searchable student lists. The
  examination filter selects PB-1, PB-2 or another recorded test; its default is
  latest recorded progress. Subject-teacher lists and explicit assignments are
  available within sections.
- **Student profiles:** basic details; private guardian/contact/home address;
  enrolled subject results and all recorded test history; school/remedial
  attendance; monitoring and progress notes; linked support tasks; overdue
  follow-ups; printable meeting view. Gender remains Not recorded until supplied.
- **Staff profiles:** targeted students from assigned tasks, linked actions,
  classroom/remedial/worksheet/practice/other-effort records and break/remedial
  teaching schedule. Profiles link back to students for meetings.
- **Monitoring records:** classroom observations, remedial monitoring, worksheet
  and practice work, other efforts, CT/Co-CT follow-up, counselling, PRT support,
  contact follow-ups, weekly reviews and faculty comments. Each includes a date,
  optional student/staff/section/topic, notes, outcome, evidence link and visibility.
  Counselling records are restricted. Evidence links must use HTTPS. Record edits
  preserve earlier note/outcome versions in the Principal view; staff projections
  omit that history.
- **Team actions:** assign a student/section, responsible teacher/counsellor/PRT,
  support category, due date, status and outcome. Assigned student tasks form the
  staff member's targeted-student list. Task/student/staff links open profiles.
- **Counsellors and PRTs:** add, edit, deactivate or remove support-team members,
  then assign student-specific actions. Primary-team names and missing contact,
  gender, examination and attendance data still need to be supplied by the school.
- **Tests and examinations:** class, date and test/PB-1/PB-2/weekly/mock type. Marks
  record the maximum and Absent explicitly. A test with marks cannot be deleted.
- **Break/remedial timetable:** day, time, class/section, teacher, room and purpose.
  Overlapping teacher, section or occupied room slots are rejected.
- **Colour settings:** editable academic and attendance thresholds, plus per-class/subject/examination overrides. The academic
  default is Red below 33%, Green from 75%. Any Red subject makes the student Red;
  otherwise missing/unassessed enrolled subjects leave the overall assessment
  incomplete. Attendance uses entered school dates only, not guessed school days.
- **Backup:** export the private Mission workspace from its toolbar. Students and
  faculty retain their existing independent feeding/export workflows. No Mission
  backup restore or bulk marks/attendance CSV importer is included yet.

Every Principal save checks the current Mission revision. Concurrent edits from
another Principal tab or verified staff comments cannot silently overwrite the
newer state. Pending saves/edit dialogs delay website-update reloads. Deleting a
student/faculty entry from feeding does not erase historical Mission records;
orphan references display as removed/unavailable rather than fabricating links.
The record date is editable; deployment does not certify that an activity occurred.

## Secure faculty PIN activation

Principal workflows above use the existing browser Firebase login and do not
need a server credential. Faculty PIN login/comments use a separate serverless
API, `/api/staff-access`, and require this one-time Vercel setting:

- **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Value:** the service-account JSON for **vidyalaya-one-app**, entered securely
  in the Vercel project's environment settings. It must have the required Firebase
  Authentication and Realtime Database permissions. Never paste the JSON/private
  key into chat or commit the credential file. The API rejects another project.
- Apply it to the intended production environment and redeploy the project.

An authorised project administrator can obtain this credential through Firebase
Project settings → Service accounts. No credential value is included in this
repository. Once the protected environment setting is available, use **Faculty
PIN settings** in Mission to set/reset a three-digit PIN or disable access for
active faculty, counsellors and PRTs. The public staff directory shows access status, never
PIN values or hashes. Principal-only settings can decrypt saved display PINs. Vacant/inactive staff cannot receive active access.

The server stores salted scrypt verification hashes and encrypted display copies under server-only
`/cbse/staffAccess`; attempts are limited by staff identity, IP and their pair.
The browser signs in with a short-lived custom token and keeps a separate staff
Firebase session, preserving a Principal session on the same device. Resetting a
PIN or disabling access invalidates existing staff sessions through version
checks/revocation. Tokens are verified server-side, including revocation checks.

Staff can select any student basic profile to leave a progress comment, as
requested. Detailed academic information requires a live teaching/CT/Co-CT/
subject allocation or targeted-task relationship. Contact/location information
is limited to assigned CT/Co-CT and counsellor access. Staff can update only their
own assigned task status/outcome. The comment author comes from the verified
identity; submitted author labels are ignored. Restricted counselling notes,
Principal-only edit history and unrelated private details are not returned.
Unassigned students expose only basic details and that staff member's own comments.
The public API directory contains only enabled staff names and role labels.

## Public display

Unauthenticated Mission pages read only `/cbse/public`, the previously approved
published name/roll/class/section/stream snapshot. Private marks, attendance,
comments, gender records, phone numbers and addresses are not added to that
publication. Public basic profiles link to the faculty PIN entry page. A normal
student Publish still controls the approved public snapshot independently of
Mission monitoring. There is no anonymous comment or database-write permission.

## Validation and remaining external steps

Local checks cover all nine teacher pairs, model rules, academic colours and
attendance, timetable conflicts, scoped staff views, salted PINs, role/ownership
checks, reset/disable behavior, attempt limits, malformed requests and the API's
fail-closed state without a credential. Browser checks use synthetic students,
actual page navigation and mocked Firebase/API responses to exercise profiles,
PB-1 marks, private contacts, support tasks, counselling, timetable validation
and public/private separation. They do not establish a live Firebase deployment.

Useful commands:

```sh
node tests/cbse-ct-update.test.mjs
node tests/cbse-mission-model.test.mjs
node tests/staff-service.test.mjs
node tests/staff-api.test.mjs
python3 tests/cbse-mission-browser.py
python3 tests/cbse-staff-browser.py
node tests/build-site.test.mjs
```

At implementation time, this agent's Firebase CLI had **no authorised account**,
`FIREBASE_SERVICE_ACCOUNT_JSON` and `VERCEL_TOKEN` were absent, and there was no
connected Firebase/Vercel management tool. Consequently it could not publish the
new rules, enter the Vercel secret, change the user's live role assignments, or
verify live production PIN login. Those are external activation steps, not
claims covered by local tests. Do not label the entire service live until they
are completed and checked with a second real device.


## Unified public dashboard and mobile navigation

`cbse-mission.html` is the one public dashboard and search destination. Legacy
`cbse-students.html` links redirect to it and preserve supported searches/profile
links. There is no separate Published search tab. Public users can browse X/XII,
sections, student profile cards and approved published fields without signing in.
Principal controls appear only after authorised access, inside **Manage portal**.

The dashboard includes a global search (including `XA`/`X-A` shorthand), class and
section filters, touch-sized student cards, a mobile bottom navigation bar and
clear loading/empty/error states. Unavailable or unpublished data displays a dash
and explanation, rather than claiming the school has zero students. Counts-only
publication continues to show its published totals without exposing names.

The Principal's private roster can be previewed from the existing student draft
while full Mission setup is pending. Academic forms and sensitive monitoring data
still require the protected Mission workspace. Anonymous requests never fall
back to private drafts. Public publication remains an explicit Principal action.

The independent `cbse-mission.css` theme uses system fonts and no additional
external assets. The build allowlist includes these CSS files. Search results and
profile navigation move to the content area while typing keeps the search field
focused. Reduced-motion preferences are respected. Existing Firebase access
rules and data schemas are unchanged by this presentation update.

Regression checks include `python3 tests/cbse-public-dashboard-browser.py` at
320/360/390/768/1440-pixel widths, legacy redirect/search checks, touch target
sizes, public-only reads, counts-only publication and empty/error states. Existing
Mission profile and student feeding/publishing browser checks were also run with
synthetic data and mocked Firebase services. Live production deployment remains
separate from these local checks.

## Dedicated teacher and support monitoring areas

The original plan is now surfaced directly through **Teacher monitoring**, with
separate dashboard cards for Faculty team, Remedial classes, Worksheets & practice,
CT/Co-CT monitoring, Counsellor monitoring, Primary support partners, Weekly review
& other efforts, and the existing break/remedial timetable. Signed-in Principal
users get the actual registers and feeding. Public visitors see descriptions
and access links only; private teacher/student records are not published.

The teacher directory has name/subject/section search and an X/XII filter. Its
cards open the existing complete staff profile: monitoring, targeted students,
assigned actions, timetable and printable meeting view. Faculty profiles now
have direct observation, remedial and worksheet buttons. Counsellor and PRT
profiles have role-appropriate follow-up buttons. The CT/Co-CT watch table shows
section assignments, open CT actions, the last section review and prefilled
review shortcuts for both roles.

New structured fields remain part of each private monitoring record:

- **Remedial:** explicit planned/conducted/cancelled status, start/end, planned
  student count, attended count, learning gap, practice given and next review.
  Planned/conducted sessions require a teacher and section; conducted sessions
  require an actual attendance count. Blank counts are not converted to zero.
- **Worksheets/practice:** status, assigned/submitted/checked counts, submission
  deadline, skill focus, work description and next review. Counts cannot exceed
  the preceding stage.
- **Classroom observations:** optional planning, participation and understanding
  judgements, agreed improvement action and next review.
- **CT/Co-CT:** attendance-watch and parent-contact follow-up status, coordination
  action and next class review.
- **Counsellor/PRT/weekly/other efforts:** role-appropriate status, support action,
  counts where relevant and next review.

Dedicated registers filter by teacher, standard and starting date. The dashboard
reports recorded sessions and explicitly conducted/reviewed entries; an older
unstructured note is not claimed to be a conducted session. A passed review date
is a reminder, not proof that a task was missed. All entries retain links to
student/staff profiles and notes/evidence. Counselling remains restricted.

Existing generic notes remain compatible and editable. New structured details
use the already-protected Mission path, so this release adds no Firebase rules
or setup step. Staff projections expose only known, typed detail fields, never
unknown fields or the Principal-only edit history. Live faculty PIN access still
has the previously documented Vercel credential prerequisite.

Validation: `node tests/cbse-monitoring-model.test.mjs` and
`python3 tests/cbse-teacher-monitoring-browser.py`. Checks use synthetic data and
mocked Firebase to verify invalid counts/times, structured session/worksheet
feeding, directory/profile navigation, filtering, CT watch, mobile layout and
public/private separation. These checks do not establish live deployment.

## Three-digit faculty PIN settings

Mission → Principal controls → Faculty PIN settings includes **Generate missing
3-digit PINs**. Only the verified Principal can generate, replace or disable PINs.
Generation creates random three-digit values for active staff without a stored
PIN; existing PINs and disabled accounts are retained. Generated PINs are visible
via Show during the current dialog visit and cleared when the dialog closes.
The server stores salted hashes and encrypted display copies for the Principal list. Individual
rows accept exactly three digits, including leading zeroes. Previous 6–12 digit
PINs remain supported for continuity. Existing failed-attempt limits apply.
This adds no Firebase rules or authentication-provider changes. It uses the
existing `/api/staff-access` server and its `FIREBASE_SERVICE_ACCOUNT_JSON`
prerequisite; generation cannot save until that server credential is configured.
The proposed shared staff curtain is a separate workflow and is not implemented
by this PIN settings change.

## Private CSV PIN updates

Principal controls → Faculty PIN settings → **New update / Import PIN CSV**
accepts `StaffID,StaffName,Class,PIN,Enabled`. Class is informational; staff ID
and name must match the current active faculty/support directory. PIN must be
exactly three digits and Enabled must be Yes or No. The template button exports
current staff identities with blank PINs; it never exports stored hashes or old
PIN values. Private generated PIN sheets must remain outside Git/build output.

Import shows the staff names and enabled state for review, with PINs hidden.
Only Save submits to the Principal-authorized server. The server independently
checks every row, prepares salted hashes, then updates all listed accounts in
one transaction. Invalid or duplicate rows reject the entire update; accounts
not listed stay unchanged. Replaced PIN versions invalidate prior staff tokens.
The secure Vercel credential prerequisite still applies; CSV does not bypass
server verification. This update does not activate the proposed staff curtain.

Checks: `node tests/cbse-pin-import.test.mjs`, `node tests/staff-service.test.mjs`,
and `python3 tests/cbse-pin-settings-browser.py` use synthetic data. The browser
check verifies that preview performs no database update until Save.

## PIN save returns “Unexpected token” / a server error

A hosting gateway can return text/HTML instead of API JSON if a function fails
before responding. Both Principal and staff screens now handle this explicitly;
the Principal import review remains open and no successful save is claimed.
The server loads Firebase Admin after checking activation, inside its error
boundary, and returns JSON diagnostics for missing or invalid credentials.

Check the Production deployment's `/api/staff-access` Function logs. Startup and
credential errors log only safe codes (`PIN_SERVICE_STARTUP_FAILED`,
`PIN_SERVICE_CREDENTIAL_INVALID`, `PIN_SERVICE_REQUEST_FAILED`), never credential
contents or PINs. Check the protected Production `FIREBASE_SERVICE_ACCOUNT_JSON`
value and redeploy after changing it. A non-JSON error alone does not establish
the underlying hosting failure; use the live URL/logs to diagnose that cause.

## Firebase Admin ESM compatibility

The Vercel logs reported `ERR_REQUIRE_ESM` from `jwks-rsa` requiring `jose`.
Firebase Admin is pinned to 13.6.0 with the lockfile resolving jwks-rsa 3.x /
jose 4.x, which supports CommonJS loading without Node's experimental require-ESM
interop. Keep the lockfile committed. Node 22 remains the deployment runtime.
`node tests/firebase-admin-runtime.test.mjs` loads App/Auth/Database and signs a
synthetic staff token with `--no-experimental-require-module`; it uses an
ephemeral local test key and makes no Firebase network calls. The protected
Production service-account variable is still required separately.


## Principal PIN list and adding faculty with a PIN

**Show PIN list** in Principal-only Faculty PIN settings reveals saved display
values. All set/import/generate/add paths retain a salted verification hash plus
an AES-256-GCM encrypted display copy, bound to the staff ID using authenticated
associated data. The display key is derived on the server from the existing
service-account private key with HKDF and a separate purpose label. No new
Vercel variable or Firebase rule is required. Only the verified Principal list
endpoint decrypts these copies; staff/public projections never include them.
The UI hides values initially and clears decrypted values on dialog close and
sign-out. Rotating the service-account key makes old display copies unreadable;
reimport the private CSV or reset those PINs to restore viewing. Verification
hashes continue working independently.

PINs stored before this feature have only hashes and cannot be recovered.
Reimport the original private PIN CSV once after deployment to enable the list
without changing those PIN values. Existing staff sessions are invalidated by
this import as with any PIN update.

**Add new faculty + PIN** in the same dialog asks for Class X/XII, name,
designation, subject expertise, teaching sections and a generated, editable
three-digit initial PIN. The Principal-authorized API validates the faculty
roster and saves faculty + PIN in one transaction. Invalid or duplicate faculty
create neither record. CT/Co-CT assignments remain in Faculty feeding.

## April–September academic history import and graphs

Principal controls → **Import academic history JSON** accepts the private
`mission-academic-history-v1` package. Review the section/student/result counts,
then Save into the existing protected Mission path. The app does not publish
these results to the public snapshot. No new Firebase rule or server credential
is needed for this Principal import. Raw spreadsheets, private JSON/CSV packages
and rosters must remain outside Git and public output.

The supplied nine workbook pattern contains 240 roster-matched students and
7200 applicable subject/month records: five monthly tests, six selected subjects
per student. All papers are /40. The importer checks names, sections, selected
subjects, session/month validity, scores and duplicate records. It rejects the
whole package on any unmatched row. Alternative Maths and XII subject options
are not invented as enrolments. Missing marks in selected subjects are AB under
the user's instruction, with the original value and inferred-absence flag kept.

Imported exams store YYYY-MM with `datePrecision: month`; exact dates are not
fabricated. The shared /40 monitoring rules are below 10 Critical, below 13 Fail,
below 18 Borderline, 18+ Secure pass. This preserves the workbook's 13/40 pass
rule; manual/PB results retain their existing percentage grading rules. Student
tiles follow the weakest subject, with AB/incomplete status never called a full
pass. Critical or fail results take priority over incomplete/AB badges. Global
colour settings explain this separation.

Reimport skips matching imported record IDs by default; explicit Correction mode may replace them.
Other marks, contacts, daily attendance, tasks and notes are retained. Existing corrections remain unchanged on ordinary repeat uploads. Correction mode
explicitly replaces matching imported results; the review reports this count. Cumulative workbook attendance is stored
separately from actual dated daily attendance and labelled as a source summary.

**Academic history & graphs** / the Academic history navigation button opens
class, section, month, subject and student filters. Subject summaries link to
confirmed section allocations; missing allocations offer Assign teacher.
Student profiles show the subject-teacher history grid, percentage-point change
between the last two appeared marks, subject graphs and consolidated monthly
graphs with coverage. Gaps/AB are not zero-valued graph points. Missing May test
data remains a gap. Exact marks and appeared maxima are displayed alongside
percentages. Authorized scoped staff profiles use the same graphs from their
safe server projection; no additional student access is granted.

Validation includes `node tests/cbse-academic-model.test.mjs` and
`python3 tests/cbse-academic-browser.py`, plus existing Mission, staff, teacher
and build checks. The complete private 240-student/7200-result package was also
validated locally and checked in the browser without writing live records.


## Meeting-centred student and teacher monitoring

Mission home keeps the X/XII → section → student flow and direct name search.
Principal shortcuts open student search, teacher review and new Samagam uploads.
Student profiles have sticky shortcuts for Academics, Call/map, Actions and
Remarks. Existing results, attendance, support tasks and monitoring notes remain
linked to the same student keys. Current-evidence tiles show Critical/deep red,
Red, Yellow or Green; genuinely unassessed/AB-only records retain an explicit
incomplete indicator rather than being claimed as a pass.

Teacher profiles include CT/Co-CT and subject-teacher meeting modes. CT mode
lists every assigned CT/Co-CT section; subject mode lists every confirmed
section/subject allocation. A subject review opens the student's complete exam
history filtered to that subject, with Full student profile and Back to teacher
meeting controls. Set CT roles in Faculty feeding and subject allocations using
Assign teacher in Academic history. Responsibility is not inferred from names.

### Samagam Excel: default incremental import

**Upload Samagam Excel · new exams** reads `.xlsx` locally with the vendored
ExcelJS reader (MIT license in vendor/exceljs). No workbook is sent to a third
party. The reader handles merged examination headers, subject maxima, selected
subject alternatives, numeric marks, AB/NE/NF/NA and missing marks. It matches
current roster names and selected subject names before importing.

The Principal reviews examination months (supplying a month when absent) and
critical/pass/secure marks per maximum. For current /40 papers the defaults
remain 10/13/18. Other maxima receive suggested values that must be reviewed.
Upcoming PB and other examinations retain their names/types and maxima. Dates
are stored at month precision when exact exam dates are absent. All tests remain
in a detailed register, including several tests in the same month; the monthly
grid uses latest-entered evidence where exact dates cannot order them.

By default, matching result identities are skipped. New exam/student/subject
results are added; existing scores and corrections stay unchanged. Repeated
uploads with no new results perform no write. **Correction mode** is explicit
and is reported before Save. Other profiles, tasks, contacts and remarks are
retained. All nine supplied workbooks were parsed and validated locally: first
pass 7200 records, repeated pass 7200 skipped. This is not a live import.

### Calls, maps and contact updates

Student, Father, Mother and additional labelled numbers render safe `tel:`
links. Clicking opens the device dialler; the portal cannot read device call
history. Log actual call/home-visit outcomes through monitoring or a staff
remark. Principal contact editing supports up to 12 labelled numbers, address,
Google Maps links or latitude/longitude. Google map links are validated.

Verified assigned staff can read/update phone/address details needed for their
student-support work. Any active PIN holder can submit a map-only update for an
existing student, as requested; this does not disclose unassigned contact,
academic or restricted counselling records. Staff updates check the contact
revision, preserve unrelated fields, and record verified actor/time. Concurrent
changes require reloading the record. No Firebase rule changes are needed;
these staff actions use the already-activated server endpoint.

### Remarks, tags and action replies

The final student section accepts a Principal remark and an optional tagged
teacher/due date. Save creates the remark and assigned action together. Tagged
actions appear in the teacher's existing action list; this is an in-app workflow.
PIN-authenticated staff choose CT/Co-CT, an allocated subject-teacher role, or
general staff support. Server checks prevent claiming an unassigned CT/subject
role. Remarks may record progress, calls or home visits, and reference an
assigned action. Each task outcome is also retained as a dated verified reply
in the student's timeline, preserving earlier replies.

Shared Principal login remains persistent. Deployment updates now also wait
for dirty inline meeting remarks/contact forms, as well as open dialogs and
pending saves. An operation-level authorization error does not force staff to
log in again; disabled/reset/inactive sessions still clear access.

Checks include cbse-samagam, cbse-contact-model and cbse-teacher-review unit
suites; staff service authorization/concurrency tests; actual browser workbook
loading, incremental imports, Principal tagging, CT/subject navigation, contact
updates, faculty remark roles and inline-deployment guards. All test data in Git
is synthetic. Production-private student/teacher files remain outside Git/build.

## CT and Co-CT display throughout monitoring

Saved `facultyDraft.classes[class].roles[section]` assignments now feed a shared
section-team display. Principal Mission home lists all X/XII section teams; class
cards and class/section overviews show both names. Student profiles, filtered
academic dashboards, teacher CT/subject reviews and a compact monitoring-area
section-team disclosure use the same live assignments. Principal name buttons
open the existing teacher meeting profile. Assigned staff student responses
include only that student's section-team names/IDs/status and display them in
Faculty PIN access. Missing/removed assignments say Not assigned; no names are
inferred or hardcoded. Existing public publication and private access boundaries
remain unchanged, with no database/rules changes.

Checks: section-team resolver and browser tests verify class-specific IDs,
updated/missing assignments, home/class/section/student display, profile links,
mobile layout and no private team display to an unauthenticated visitor. Existing
academics, staff and teacher-monitoring regressions passed.

## Percentage criteria and population denominators

Academic headers now show percentage-based criteria derived from each stored
paper maximum/rule, including the current /40 pattern: Critical fail below 25%,
other Fail 25% to below 32.5%, Borderline 32.5% to below 45%, Secure pass 45%+.
The header explicitly explains that the source workbook passes at 13/40=32.5%.
No grading thresholds or saved marks changed. Manual paper rules and different
maxima are represented separately. AB remains AB, never 0%.

Monthly subject grids pair marks with a percentage column; complete exam
registers, teacher reviews and legacy staff result tables also retain marks plus
percentage. Student tiles show the latest appeared-paper percentage and weakest
subject percentage with coverage. Student subject counts use a subject
denominator, never a student denominator.

Academic counts display N out of the class/section/subject population, along
with a combined Critical+other Fail support total. Search changes shown counts
without shrinking the cohort denominator. Subject summaries include both the
section population and actual subject enrolment, distinguishing them from the
appeared denominator used in pass percentages. Class summaries and teacher
section reviews also state population totals. Staff lists show found/total and
assigned counts; student profiles retain section size.

Validation: performance formatting unit test, cohort/percentage browser test,
existing academic, meeting, Principal/staff and static-build checks.
# VC support teams and Calendar setup

The Principal can use **Import individual VC setup** to review a private
`mission-vc-support-v1` TXT/JSON package or its readable CSV version. It reuses matching staff, adds only the
listed support members, and imports email addresses only for relevant roster
matches. Existing CT/Co-CT, subject allocations, student contacts, marks,
attendance and individual Meet links are retained. The source's Verified / Not
Verified label describes the uploaded sheet, not proof of mailbox ownership.

The visible **Support team / co-opted members** control lists saved support members; they are not part of the subject-faculty CSV export. A reviewed setup CSV may also contain Teaching rows from the supplied current faculty roster: these fill only missing, uniquely matched subject/section assignments and retain every saved choice.

Support duties are separate from ordinary subject-teacher allocations. Co-opted
PRTs cover their specified section's non-AI subjects; AI support covers only
enrolled AI students; counsellor and special educator cover all sections.
Responsibilities appear in staff, section and student profiles. New support staff
use the existing Faculty PIN settings flow when they need to submit updates.

After saving setup, **Download individual VC update** produces a private Apps Script from the current saved student/teacher assignments, emails and existing individual links. Class VC is paused: its existing records are retained, but section/student Class VC controls are hidden and new exports have no Class VC work.

For each student the plan includes their saved email, CT/Co-CT, assigned subject teachers (including saved temporary/cross-class teaching coverage), and subject-scoped support members. Active valid emails are deduplicated. Missing roles, teacher assignments/emails, student emails, shared student mailboxes or meeting links, and individual/Class VC link reuse are flagged. Rows with incomplete identities/team data are not eligible for automatic guest synchronization. No participants are guessed and no replacement meetings are created.

In the school Google account, replace only the earlier **VCUpdate.gs** update file (or add it if absent); retain the original meeting-generation code and Calendar advanced service. Run `vcPrepareUpdate` to refresh the existing private workbook; review the planned Guests column and Issues tab. Then run `vcApplyNextBatch` for batches of up to 50 existing individual events. It requires a unique matching event organized by the school account and the saved student email already present on that event; missing/ambiguous events and unmatched identities are skipped for manual review. It preserves the Meet link and retained guests’ response metadata, adds concerned saved teachers/support, removes guests outside that exact student/team list, makes the Calendar event private and disables guest modifications, invitations and guest-list visibility. Requests use `sendUpdates:none`. The downloaded script is not run by the portal or by a GitHub deployment. Exporting does not send invitations or change Calendar.

The generated update script is syntax-checked against ES2019 for Apps Script V8 compatibility; newer logical-assignment and optional-chaining operators are not emitted.

The resulting status is **Guests updated; Meet access unverified**. Calendar guests are not proof of Meet admission restrictions or co-host privileges. The organizer must configure and verify Restricted access, disable uninvited joining/requests where supported, and add eligible concerned teachers as co-hosts to let them start meetings. If the account/licence does not support that, the organizer must start and supervise admission. Never share the school password. The portal has no authenticated Calendar/Meet connection to perform or verify these settings, and cannot guarantee outsiders are blocked merely because a link is private in the portal.

Each private student profile has a compact coloured **Important contacts · One-to-one VC** plate. Labels use smaller muted type; saved values are larger/bolder. The entered `location` field is labelled **Address** and is never used to fabricate a current Maps location. **Google Maps current location** appears once and opens only a saved validated `mapLocation`; if absent it says Not added. Its adjacent Add / update control opens a map-only form. Mobile numbers have their own single Add / update control and number-only form. In the open staff area, both require an active contributor name and personal PIN. Principal view uses the existing authenticated Principal identity automatically, without a staff-name selection or PIN prompt. Inline teacher review follows the same active-session distinction. Neither form can overwrite the other fields. Principal basic-details/address editing remains separate and contains no mobile or Maps controls. The existing revision checks, verified contributor attribution and private audit remain in force.

Each saved mobile offers Call and ordinary WhatsApp messaging. VC sharing appears only beside the **One-to-one VC** join link: a single WhatsApp recipient chooser and device Share/copy action. There are no per-number Share VC controls, combined phone/location updater or Log call/home visit button. WhatsApp opens a draft and never auto-sends. Missing VC links remain visibly missing; the map/VC records are not inferred or replaced by this layout change.


Private setup, exported scripts, guest lists and meeting links must not be committed or added to public assets.

Reviewed TemporaryTeaching CSV rows may reference an existing faculty ID in another standard (for example X:faculty_id for a XII assignment). This reuses the existing identity and PIN instead of duplicating the teacher. Temporary coverage is labelled in profiles and subject tables. Only missing or vacant assignments are filled; active saved choices are retained.

Student portraits use a separate Principal-only **Import student photos CSV**
review/save flow. The exact columns are Class, Section, StudentName, PhotoDataURL,
Width, Height. A unique current roster match is required; source roll/admission
numbers never substitute for a matching name. Imports merge only studentPhotos,
retain existing data and are idempotent. Store photo CSVs and extracted images
outside the repository. No student photo belongs in public build assets.

Photos appear in private student profiles, student cards, search results, teacher
reviews and academic lists beside keyed student names. Student comment icons remain unchanged. Staff browsing snapshots
exclude the photo collection. The existing staff-view cookie gates the
view-student-photo and view-student-photos actions, which return one photo or at most 20 requested photos with no-store
headers. Direct Firebase reads/writes remain Principal-only under existing rules.


## Repeated individual VC batches (resume repair)

Do not add successive "Updated 50" messages to infer unique completed events. The earlier completion check required `guestsCanModify === false`, even though Calendar can omit this default-false value. This could repeatedly patch the first batch. The v3 sync accepts an omitted default for this field, re-reads each patched event, and reports actual verified completion, pending and review counts. It records the attempted desired signature plus returned Calendar version in private user properties; an unchanged event that still fails verification is held for manual review rather than patched indefinitely. External changes with a new Calendar version can be reviewed/synced again. Meet admission/co-hosts remain a separate unverified state.

For a project already containing the private `VC_PLAN`, Principal controls → **Download VC resume fix** provides a data-free `VCResumeFix.gs` add-on. Add it as a separate file; keep the existing `VCUpdate.gs` and original meeting-generation file. Run **vcCheckIndividualProgress** first. That path reads Calendar, the review sheet and private properties but writes none of them. It logs aggregate reasons and row counts without student names/emails. Review the log before using **vcApplyNextBatchFixed**. Never continue using the older batch function after adding the repair.

A fresh full export already includes the repaired engine. If replacing `VCUpdate.gs` with that full export later, remove the separate repair add-on to avoid duplicate helper definitions. Do not run `vcPrepareUpdate` merely to install the add-on: it can use the existing reviewed sheet and its original private plan.

## MCQs महाअभियान · simplified contribution and paper preparation

The MCQ entrance asks for **name → class → subject**, followed by three clear choices: Contribute a question, Prepare QP, and Evaluation. The selected teacher is carried across the workspace; their name does not need to be reselected on every form. Staff use their own PIN when saving. The signed-in Principal uses automatic identity without a staff PIN. Class X/XII remain separate banks, and the entrance defaults available class/subject choices from saved teaching duties.

Contributions save **one question at a time**. Select subject and topic, paste the complete prepared question with its options, and/or attach images. **Take photo**, **Add images**, and Ctrl+V screenshot paste attach images directly to the same question. All attached images count as one question. Select A, B, C or D from the compact correct-option dropdown on the right and press Save question. There is no bulk question parser, answer-key paste, OCR/PDF conversion or processing step in this form. On a confirmed save, the question text, images and answer selection clear for the next question; subject/topic/name remain. Failed saves preserve the question. Inputs are locked while saving, and retries use an idempotent request ID.

New questions use short subject codes, e.g. **QH001** for Hindi, QE001 for English and QM001 for Maths. Papers use **QPH001**, QPE001 and QPM001. Subject-code counters are shared across Class X/XII to prevent duplicates. The three-digit series runs from 001 through 999 and never wraps or overwrites a saved record. Other subject names use distinct short letter codes (e.g. HI for History, SS for Social Science). Existing long question/paper IDs remain usable and existing bank/evaluation data is preserved.

Paper preparation is **class → subject → topic/search → Add questions → Generate paper**. Selections remain when filtering/searching and the selected count is visible. A paper accepts any non-empty selection of distinct saved questions from one subject. Its question order, images and private answer key are frozen when saved. Answer-free A4 printing includes the short paper code and question codes. Saved papers remain available to other teachers/sections in the private ready-paper library.

A single question can contain text plus up to eight images. Images are resized locally and stored with the question; raw images are not sent to an OCR service. Mathematical notation is retained as supplied. The locally bundled Noto Sans Math font remains available for Unicode text, and original image notation is preserved for printing. Teachers supply ready questions and select the correct option directly.

Evaluation accepts a paper code or one photo containing its QR and marked printed A–D response strip. It attempts QR reading and automatic strip isolation without a compulsory crop. Teachers select the student, check detected answers, resolve ambiguous marks, and save through the existing authenticated/PIN route. Scores are recorded in academic performance. Handwritten answers require manual entry; no general handwriting or mathematical OCR is claimed. The photo is only saved as private evaluation evidence after explicit submission. Paper creation retains the Firebase cold-cache retry fix and rejects genuinely missing questions without changing bank records.

Validation: `node --test tests/*.test.mjs` and `python3 tests/cbse-mcq-simple-browser.py` and `python3 tests/cbse-mcq-entry-evaluation-browser.py` cover short-code generation, legacy compatibility, one-question text/images, answer privacy, PIN/Principal identity, retained selections, printing and evaluation. Earlier bulk-contribution/OCR browser scenarios refer to the superseded UI and are not the current workflow.

## Shared bright Mission theme

The screen-only `cbse-mission-theme.css` applies to detail views: teacher/student navigation, profiles, contacts, conversations, MCQ areas, academic panels and dialogs. The launch page retains its previous layout, colours and search presentation. A single permanent MCQ shortcut remains in the header; duplicate hero, navigation and Principal-tools entries have been removed. Detail views retain the light background, coloured cards, readable labels and visible focus states. Contribution, QP and evaluation use green, blue and purple action cards. Academic red/amber/green indicators, Principal/PIN access rules and compact print layouts retain their existing meaning. The theme uses system fonts and CSS gradients; it adds no decorative image downloads, animation libraries or external font calls. Desktop navigation wraps so all areas remain visible; mobile navigation stays compact.

Responsive and privacy regressions are checked by the dashboard-layout, profile-contact, conversation-simple and academic browser checks, alongside the MCQ workflow checks above. Principal password-only login and the persistent session remain unchanged.

Deployment HTML versions local entry scripts and stylesheets with the generated app version, so refreshed pages request the current navigation and theme rather than reusing older files. Build-delivery changes are included in that version hash. The existing update watcher still waits for active forms and pending saves and preserves authenticated sessions. The header remains the only MCQ navigation shortcut.

## Subject-wise MCQ CSV upload

Question bank and the single-question contribution screen provide **Bulk upload CSV**. Choose class/subject, download its UTF-8 template, replace the example in Excel, and save as CSV UTF-8. The four columns are **Subject, Topic, Question, CorrectAnswer**. Put the complete question and A–D options in one Question cell; multiline text, commas, quotes, Hindi and Unicode maths are preserved. Each row becomes one question. CorrectAnswer accepts A–D (also क–घ or 1–4); blank Subject uses the selected subject, and blank Topic uses Mixed. Class is selected in the portal rather than repeated in the file. Images remain supported through the single-question form.

A file may contain up to 100 rows and 500 KB. Review the displayed rows, then import once using the teacher's PIN; the Principal uses automatic identity. Validation runs again on the server. Invalid rows and conflicting answers stop the whole import without partial saves. Exact same class/subject/topic/question/answer duplicates are skipped, including repeated rows in the same file. Retried requests do not create extra records. Short question codes and contributor records are generated automatically. Correct answers are absent from bank/paper responses.

QP preparation shows readable question cards with one question code and topic, green selected cards, and a removable list of selected codes. Filters/search retain selections. CSV-created questions use the same paper printing and evaluation workflow as individual contributions. Validation includes `tests/cbse-mcq-csv.test.mjs`, the staff-service PIN/Principal tests, and `tests/cbse-mcq-csv-browser.py`.

## Correct and delete shared MCQ questions

Every bank/QP-selection question card has **Edit** and **Delete**. Any active staff member with an enabled, valid personal PIN may correct or delete any question, including a different contributor's or another class's question. Select the acting member in the correction/deletion dialog and submit their PIN. The Principal uses the existing authenticated identity automatically. This permission applies to question maintenance; contribution, paper and evaluation permissions retain their existing class rules.

Edit supports question text/options, replacement or additional images, topic and correct option. The correct option must be explicitly selected before saving; answer keys are never included in the ordinary bank response. Subject and permanent code stay fixed. Legacy text/options and photo questions can be corrected using the same form. The PIN clears after every save attempt; a failed save preserves the correction. Revision checks reject stale edits/deletions instead of overwriting another person's work.

Delete requires an explicit PIN-protected deletion submission. It hides the question from the bank, topics, contribution-batch selection and new papers. Private tombstones retain the permanent code; codes are never reused. Previous question snapshots and the acting member/time are retained in private `questionAudit` records for edits and deletions. Existing saved papers, their frozen answer keys and recorded scores remain unchanged. Browser and service checks cover wrong/disabled PINs, another-class member, Principal identity, legacy question conversion, mobile dialogs, stale revisions, retries and saved-paper preservation.

QP preparation includes a sticky selection belt above the question controls. It shows the total selected and per-topic counts from all selected questions, including those hidden by a topic/search filter or pagination. Adding/removing questions, removing selected-code chips, clearing selection and changing subject update the belt. Topic chips scroll horizontally on small screens; the total remains visible. No animation or network request is needed for count updates. `tests/cbse-mcq-selection-belt-browser.py` covers multiple topics, filtering, deselection, clearing and sticky mobile/desktop scrolling.

## MCQ attribution and participation

Question cards finish with **Contributor** and **Latest editor**, using saved attribution rather than the currently selected teacher. New cards show “Not edited yet”; missing legacy names show “Not recorded”. QP preparation labels the acting member **Prepared by**. Generated-paper previews, the shared ready-paper library, evaluation and printed QPs show the saved preparer's name.

Loading a paper in Evaluation shows usage grouped by class/section, evaluator names and a list of students with saved results. Each student links to their profile and shows a current academic-status badge, total distinct MCQ tests attended and this paper's score. The header/group counts identify **current critical cases** among attendees; they describe current academic status, not a historical baseline at the time of attendance. Saved evaluations establish participation; merely selecting, printing or opening a paper does not. Corrections to the same student's paper count once. Missing/deleted roster entries are excluded from usage lists, and absent/non-MCQ results do not count.

Private student profiles have an expandable **MCQ tests attended** badge listing paper codes and scores. It uses existing academic marks and therefore includes earlier saved MCQ evaluations. Compact staff-view transport retains MCQ evaluator attribution without sending private answer keys, response photos or evaluation evidence. A confirmed evaluation response updates the open usage list immediately. Existing Principal/PIN permissions and published-profile boundaries are retained. Tests include `tests/cbse-mcq-participation.test.mjs` and `tests/cbse-mcq-credit-usage-browser.py`.

## Team contribution at a glance · News

**Team News** opens a simple shared page. An active member selects their own name, writes a message of at most **100 whitespace-separated words**, optionally attaches **one photo**, and posts with their own enabled PIN. The signed-in Principal uses automatic identity. Camera, image selection and screenshot paste accept a single photo; choosing another replaces it. Photos are resized locally to at most 100 KB of JPEG data. A word counter blocks longer posts, and the server enforces the limit independently. News and comments show verified author names and India-local dates/times; supplied author labels cannot override server identity. Comments also use a 100-word form and verified identity.

Every teacher/support-team profile includes the same **Team contribution at a glance** feed, with the three newest News items and links to view/comment or create News. Open, visible profile feeds check for updates every 30 seconds. The full page shows five items per page, with older/newer paging. A News thread has paginated comments, a refresh button and the comment form. Failed saves preserve text/photo, clear the PIN and keep the request ID for a retry. Retries do not duplicate posts or comments.

News uses the separate private `cbse/teamNews` branch, not student or academic records. Metadata reads exclude photo bytes; a photo is loaded separately through the staff-view/Principal-authorized service. Raw database access remains denied by default, and the public launch/student views do not display private News. Posting and comments require an active staff identity with enabled PIN access, or the authorized Principal token. No change is made to the Principal's password-only login or persistent session. Tests include `tests/cbse-team-news.test.mjs`, staff-service access/idempotency tests and `tests/cbse-team-news-browser.py` for photo/word limits, PIN errors, comments, profile visibility, automatic refresh and mobile layout.

## Flexible QP selection, section saving and measured A4 layout

The former 20-question paper limit is removed from selection and server validation. Selected IDs remain checked across topic/search filters, bank pagination and workspace navigation. Per-class/subject/member session drafts keep **IDs only**, A4 options and section scope, so returning to the same subject after a reload recovers the selection from the server. No question text, images or PINs are written to that browser draft. Missing/deleted questions are reported and excluded during recovery; a failed recovery preserves the saved draft and blocks generation until Refresh bank retries successfully. Explicit staff-view lock/Principal sign-out clears these session drafts. Reload retains the portal's existing return-to-launch behavior.

A sticky header shows selected totals, topic counts and a measured **A4 usage** estimate. **A4 page setup** controls header title/style, one/two columns, text size (9–14 pt), margins, spacing, image height, QR size (22–32 mm), and answer-strip placement (after questions, separate answer sheets, or none for manual response entry). Optional targets include 0.5, 0.75, 1, 1.25, 1.5, 1.75 and 2+ pages. A target tries compact font/spacing/image settings; it does not omit questions, cut images or shrink below the configured minimum sizes to force a fit. If the target cannot fit, the actual requirement is shown. Fractions describe quarter-page-rounded content usage; PDF output always uses whole A4 sheets.

The preview and print renderer use the same measured layout. Images/fonts load before measurement, complete questions stay together where possible, and oversized questions continue across columns/pages with continuation labels. QR/header, identity fields, OMR blocks and page numbers are included in the layout measurement. Print uses explicit 210 × 297 mm sheets. Review image/map labels at print size. The ready-QP preview also offers adjustable print layout without changing its frozen question/answer snapshots.

Before generating, choose **Save test for → My section** (select the section) or **All sections**. Server validation saves real roster section IDs/names and normalized A4 settings. Section-specific QPs only evaluate students in that saved section; all-section QPs support every saved section of the selected class. The **Ready-made QPs** button in the bank opens the stored-paper library, with search, section filtering, saved-for labels, preview, printing and evaluation actions. Legacy QPs remain all-section papers unless a saved scope exists.

Larger papers print numbered response blocks of up to 20 questions, each with its own paper/block QR. For evaluation, photograph one block at a time; its QR sets the question offset, and newly read responses merge into the existing answers rather than clearing earlier blocks. If QR reading fails after loading a paper, the teacher can choose the numbered block manually. Compact strips save space for small question counts; scanning accepts compact and legacy strip geometry. The existing explicit student/answer review and PIN/Principal save remain required.

Validation includes `tests/cbse-mcq-page-layout.test.mjs`, section/layout staff-service tests, and `tests/cbse-mcq-a4-browser.py`: 53 questions across two topics and multiple bank pages, reload recovery, varying text/images, no A4-boundary overflow, actual PDF output with matching page count, section/all-section saves, ready-QP filtering, multi-block QR/response merging, mobile controls and draft clearing on staff-view lock. Existing single-question, ready-library, CSV and selection-belt browser checks remain relevant.

Half-page targets: the measured usage gauge now starts at 0.5 rather than forcing every small test to report at least one page. Teachers can choose 0.5 or 0.75 and add/remove questions while watching the estimate. A small test still produces one physical A4 PDF sheet. The default PDF branding is a single thin strip reading **PM SHRI KV 1 Itanagar · Mission Perfect 100 · MCQ महाअभियान** on every sheet. Class/subject/code, preparer and student identity fields are arranged compactly beside the QR below the strip. The default QR is 22 mm, and the existing size control remains available. Legacy default “MCQs महाअभियान” titles adopt the branding; custom titles are preserved. `tests/cbse-mcq-half-page-browser.py` checks both targets, measured usage below one page, a single-sheet PDF, the thin strip and mobile controls.

## Launch-page application reference tiles

The main Vidyalaya One launch page uses the ten supplied PDF reference images for Samagam, Timetable, Mission Perfect 100, VEMS, UBI fees, UDISE+, PRASHAST, Medha AI, KVS transfer and Samvida Sathi. They are bundled public `portal-tile-*` assets, shown as uncropped previews with lazy loading and descriptive alternative text. Tile headings/actions remain readable HTML links. VEMS is labelled **Vidyalaya Examination Management System (VEMS)**; PIS/PIMS is removed and **Samvida Sathi** uses the user-confirmed `https://samvida-sathi.kvs.gov.in/` destination. Other portal destinations and the launch hero remain as before.

The live Firebase application catalogue retains these curated reference tiles, removes the old personnel tile, and continues to render other valid configured applications. Missing other bundled apps remain available if an older live catalogue is incomplete. Metadata matching uses known titles/URLs rather than broad keyword matches, so unrelated future applications are preserved. No catalogue data is written to Firebase. The build includes only `portal-tile-*` JPEG assets in addition to its existing image rules. `tests/launch-reference-tiles-browser.py` checks an older connected catalogue, PIS removal, Samvida and Mission links, all ten images, preservation of other apps and phone/tablet/desktop layouts.

The remaining five tiles now use the second supplied PDF's reference images: CBSE, iGOT Karmayogi, NCERT, DIKSHA and NISHTHA. All fifteen bundled application tiles have the same responsive image-card layout. Their existing destination URLs are retained. The connected catalogue preserves these reference tiles while continuing to display unrelated configured applications. The launch browser check now verifies all fifteen images and the five retained official destinations.

## Direct MCQ entry and bank-first navigation

The MCQ header shortcut uses a same-document hash link, preserving query parameters, the loaded school data and the existing authenticated session. While access/data is connecting, the MCQ route renders a dedicated loading pane instead of falling through to the Mission Overview. A lightweight HTML loading shell is available while the main module downloads. The Mission hero/statistics are hidden only on MCQ routes; they return in other areas. No extra login or PIN step is introduced, and the existing staff-view gate still applies when access is unavailable.

The entry and workspace share a large **Question bank** tile, labelled “Stored questions · Ready-made QPs”, followed by three smaller cells: **1 · Contribute** (green), **2 · Prepare QP** (blue), and **3 · Evaluate** (purple). The selected class/subject/name flow and saved selections are retained. `tests/cbse-mcq-direct-entry-browser.py` checks delayed data/module downloads, no Overview flash or document reload (including query-string entry), preserved auth initialization, the existing-session path, unauthorized access gating, bank/action hierarchy, distinct colours and responsive layouts.

## Class X Maths section-wise current enrolments

**X · Maths students** shows a section-wise summary before any option is selected: Maths Basic (241), Maths Standard (041), Not set, Both marked (review) and total roster, followed by an all-section total. Counts derive from current saved enrolments, never from marks or inferred stream choices. Generic/unspecified Maths remains Not set. Both-marked pupils are counted in both option columns and flagged separately so a data-entry problem is visible rather than silently assigned to one course.

Click a Basic/Standard count to open that option's pupils for the selected section, or use the section selector to view one/all sections. Student profile links retain the option/section when returning. Principal draft subscriptions recompute the summary/lists after saved edits; idle visible staff views use the existing draft-version polling to fetch changes. No separately cached or manually maintained totals are stored. The XII subject list and access/PIN permissions are unchanged. Unit/browser checks cover Basic-to-Standard changes, unset/both choices, student removal, section/profile navigation, Principal live snapshots, staff refresh and responsive layout.

## Maths Basic history after a saved Standard-only subject change
Class X academic snapshots, profiles, graphs and subject progress project previous Maths results under the pupil's single current Maths option: Basic (241) to Standard (041), or Standard to Basic. Exactly one Basic/Standard subject must be selected. Scores, maxima, exam IDs/dates, absence and imported grading metadata remain unchanged. Stored marks and original IDs remain intact; an existing result under the current Maths option for the same examination always takes priority, including zero or AB. Both-marked, unspecified Maths and XII records do not receive this carry-over. The profile displays a carry-forward note. This is a read-time correction from current saved enrolments, requiring no export, migration or Principal write on page load. Names and private student data are not embedded in the code. Inactive historical Maths results remain valid for subsequent private saves while the single current Maths enrolment applies.

Validation: `tests/cbse-maths-carryover.test.mjs` covers score/AB preservation, same-exam precedence, enrolment boundaries, source immutability, current-subject validation and academic/progress integration. `tests/cbse-maths-carryover-browser.py` checks both carry-over directions in the actual profile, no database writes, and responsive layout. The existing academic import/edit/privacy browser check also passes.

## Direct MCQ bank and separate ready-made QP library
MCQ entry chooses name/class/subject once, opens the question bank automatically on subject selection, and remembers that choice in tab-scoped session storage. Explicit Change name / class / subject keeps the selector available. The workspace uses three compact steps: Question bank, Create QP PDF, Evaluation. Questions appear directly with an inline Add new question panel between the listed cards (or below the empty bank); it supports text, camera, image uploads and screenshot paste. It reuses the selected subject and refreshes the bank after saving. CSV bulk import remains available.

Ready-made QPs is a separate workspace option, not embedded in the bank or paper builder. It supports subject/section/search filters, on-screen soft-copy preview, A4 PDF/print and reuse for evaluation. Edit / revise restores the selected question IDs, page settings and section scope in the builder; saving with the existing staff PIN workflow creates a new QP code and preserves the original frozen paper and evaluations. Current question-bank versions are used for the revision, and unavailable questions are reported by selection restoration. Delete QP uses the existing active-member PIN or authenticated Principal path and an atomic transaction. It archives the library entry, logs the actor and previous snapshot privately, rejects stale changes and deduplicates retries. Existing printed QR codes, frozen questions and recorded evaluations remain available by code. Browsing still excludes answer keys and private audit records. Principal sign-in and staff viewing remain unchanged.

Validation: full Node suite plus browser checks for automatic/remembered entry, inline contribution, generation/evaluation, direct navigation, separate-library search/pagination/PDF, PIN rejection/revision/deletion, usage metadata, mobile layout and large A4 papers. New service checks verify subject filtering, unauthorised/stale deletion rejection, archival/audit preservation and idempotent deletion retries.


## Minimal MCQ workspace
The bank itself is now the starting workspace and supports ticking questions immediately. The only main action is Create QP PDF; it carries the checked questions into the PDF builder. Saved selection recovery and topic counts work across the bank and builder. Repeated coloured step tiles and the portal-wide navigation strip are removed from MCQ screens. The class/subject line has a small Change link; Ready-made QPs and Evaluation are small secondary links. Subject selection is not repeated when already chosen. Add new question remains an inline text/image panel, CSV upload is under More, and refresh is a small labelled icon. Existing PIN, Principal, ready-paper revision/archive and evaluation rules are unchanged. Browser checks cover direct bank selection through PDF generation, inline saving, remembered subject, separate-library controls, QR evaluation and responsive layout.

Bulk CSV and the More import menu are displayed only in Principal view. A direct staff import URL shows an explanatory message instead of the upload form. Ordinary staff question contribution, QP generation and evaluation retain their existing PIN workflow.

## Explicit bank / contribution / paper / evaluation order
The entry selector is unchanged. Inside, Bank is visible above the subject-topic dropdown (including Add new topic) and word/question-number search. A separate colourful Add new question strip sits above the stored question list, rather than between question cards. It opens the topic selector, optional new-topic name, text/image question content and correct-answer dropdown. New topic names are saved with their question; the bank dropdown refreshes after save. The inline form has Back to bank. Prepare question paper & PDF and Evaluate follow the question list, and paper/evaluation/library screens have an explicit Back to bank link. Selected questions survive the return. No additional step tiles are introduced. Principal-only CSV visibility remains unchanged.

Validation: `tests/cbse-mcq-bank-order-browser.py` exercises bank topic creation, question save, code search, contribution-strip ordering, selected-question recovery and the prepare/evaluate return paths at mobile/tablet/desktop widths. The existing library management and entry/QR evaluation checks and full Node suite also pass.

## Three separate MCQ workflows
The starting area now contains only Class and Subject selectors and three choices: (1) See question bank, (2) Select questions & make question paper, (3) Evaluation. Choosing class/subject does not automatically enter a workflow and no staff name/PIN is requested at entry. Back from each area returns to this same start screen with class/subject retained.

Question bank is browse/add only: topic/search filters and the coloured Add new question panel, with no paper-selection checkboxes, selection belt, paper/PDF or evaluation actions. Quiet per-question correction/deletion remains in its optional context menu; Principal-only CSV remains under More. The paper area alone has question checkboxes, saved selection recovery, PDF layout/generation and the separate ready-made QP library. It has no contribution panel. Evaluation retains the established QR/photo/manual review, student/section selection and PIN save process.

Staff names are visible selectable fields at contribution, paper save and evaluation, even if a previous identity was remembered; PINs are requested and cleared by the existing save workflow. Browsing requires neither a selected contributor nor a PIN. Signed-in Principal authorization is unchanged. Selecting a contributor does not reset an explicitly selected subject/new topic.

Validation: full Node suite and browser checks for all three paths, browse-only/add-only separation, visible identity fields at write time, successful question deposit, independent paper creation, whole-photo QR/OMR evaluation, selection recovery via Back/start, new topic preservation, Principal-only CSV, ready-made QP revision/deletion and responsive layout.


## Fourth start choice: ready-made QP store
The class/subject start screen now includes a fourth choice, Ready-made question papers, opening the existing subject-filtered saved-paper store directly. Its soft-copy preview, PDF/print, PIN-protected revision/deletion and Back behavior are retained. CSV upload and bulk controls remain inside the question bank under More, visible only to the authenticated Principal; neither staff nor the starting screen shows them. Validation uses the ready-paper workflow browser check (including four start choices) and the Principal-only CSV browser check.
