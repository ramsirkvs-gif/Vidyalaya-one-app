# Mission Perfect 100 — activation and use

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
PIN settings** in Mission to set/reset a 6–12 digit PIN or disable access for
active faculty, counsellors and PRTs. The directory shows access status, never
original PIN values or hashes. Vacant/inactive staff cannot receive active access.

The source code stores salted scrypt hashes only under server-only
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
