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

MCQ arranging accepts English/Hindi question prefixes, Latin/Hindi option letters and parenthesised numeric/Roman option labels. It preserves option order and mathematical characters, extracts explicit per-question answers or a trailing answer-key block, and removes extracted keys from question content. Exactly four options are required. Repeated labels receive a visible review warning; conflicting answer sources block processing. Pasted answer keys support numbered lists, copied question/answer tables, compact A–D strings and numeric/Roman option positions. The preview shows question/answer/review counts; permanent IDs are assigned only at deposit. This is format recognition, not mathematical correction or automatic diagram reconstruction.

MCQ contribution now has always-visible Take photo and Upload PDF / photo actions before the notepad. The camera input requests the rear camera on supported phones; the file input accepts screenshots/images and PDFs without forcing camera capture. A local import dialog previews the selected file/page and offers Convert to text or Use as image. Teachers can read a PDF page range (up to 20 pages per operation), force OCR for poorly encoded/scanned pages, crop a text region, or crop multiple complete question images from a book page. Images are staged with remove actions before being added; cancellation before addition leaves the contribution unchanged. Text is appended and renumbered; extracted answer keys are retained as per-question answer lines for the arranger to remove and review. Existing notepad content is preserved. PDF.js, its worker, fonts, CMaps and WASM assets are built from the pinned dependency and served locally; OCR remains local English/Hindi. Raw PDFs/photos are not uploaded to a conversion service. Only reviewed question text and compressed question images are submitted through the existing authenticated/PIN contribution route. Principal identity remains automatic; staff contributions still require their selected name and PIN.

PC screenshots can also be pasted directly with Ctrl+V (Command+V on Mac) into the main question notepad or the dedicated Paste screenshot here box. Image clipboard items open the same local import dialog and require an explicit text-conversion/image-crop choice. Ordinary text paste in the notepad keeps native editing behavior. No clipboard-read permission request is needed: the image is read only from the user's paste event.
