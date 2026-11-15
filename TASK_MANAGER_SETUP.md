# Task manager

Open **Principal Chamber → Task manager**, or **Students feeding → Task manager**.
The Chamber tile opens Principal view when the existing Principal session is
verified. Principal view uses the same persistent Firebase session as the rest
of the portal; it only asks for the existing password when signed out. Explicit
Sign out clears protected task content. Staff use the **already generated portal
PINs**, including existing linked staff identities. No new PIN is generated or
reset by Task manager.

## Task 1: private draft, no live creation assumed

After deploying the code with the existing protected server credential, open
Principal view and click **Create Task 1 unpublished draft**. This creates
`cbse/taskManager/tasks/task1` through the Principal-authorized API. Repeating
the action preserves an existing task, its publication state and all reports.
The title is the requested HQ-meeting survey; priority is High priority / Most
urgent. Deadline, assignments and class figures are unprovided. It is not
published automatically. The instructions and title of this initial draft are
kept in the server seed, outside the generated public website.

For an administrator who needs a private import instead, the safe template is
`private-templates/task1-draft.json`. It contains instructions and empty report
containers only, with no student/staff records or credentials. In the Firebase
Console select **exactly** `/cbse/taskManager/tasks/task1` and import this JSON
only when that child does not already exist. Never import at the database root,
at `/cbse`, or over an existing task. Console import is an administrator action;
direct browser database writes are intentionally denied. Keep filled figures,
reports and private backups out of Git and public hosting.

## Principal workflow

1. Open **Edit task, survey questions and teacher assignments**. All survey
   questions appear below the task instructions. Edit their full wording, use **Add survey question** (up to 60), or click
   **Delete question** beside a fillable question and confirm. Save the private
   draft and Publish to apply deletions. Q1–Q3 and the final comment stay fixed;
   keep at least one fillable question. Earlier submitted answers are preserved,
   including answers to deleted questions when teachers submit an updated report.
   The Principal can expand **Earlier answers to deleted questions** inside the
   class report. Q1–Q3 are the read-only class figures (total students, Cat-V and ST);
   editable questions begin at Q4. Count-type dropdowns are not shown.
   Existing meeting fields such as PTMs retain their meeting-count validation;
   added questions default to student counts. Responses remain aggregate counts,
   not personal narratives. Assign an active existing
   teacher to each concerned class. Use **Applies to selected classes** to add or
   remove classes from the task. Available classes are VI–XII; existing tasks
   default to the original 18 IX–XII classes. Questions are shared task-wide: edit
   once and publish once for every selected class. Q1–Q3 and assigned teachers
   vary per class. Removing a class preserves its reports for Principal review
   but excludes it from current totals, the public list and staff submission access.
   Re-selecting and publishing restores permitted access to its retained report.
   The corrected entry is **XI E**, not X E.
2. Enter total students, Cat-V students and ST students, or click
   **Download class figures CSV template** beside the import control. The file
   contains the currently selected classes and columns `Class,AssignedTeacher,TotalStudents,CatVStudents,STStudents`.
   Fill exact existing teacher names and class counts, then use **Import class figures and save shared draft** to import and save all class
   rows and the shared draft in one authenticated Principal action. The same
   import button sits directly beside the class-wise Q1–Q3 table. New unsaved
   tasks stage imports until created. Imported figures remain private until Publish. The last imported class figures
   are retained privately as defaults for newly prepared tasks; importing new
   defaults does not change the figures in existing published task snapshots. Blank
   teacher cells preserve current assignments; blank counts remain unprovided.
   Unknown or ambiguous teacher names and invalid rows reject the entire import,
   so choose ambiguous identities directly in the form. JSON is still supported
   for class figures without teacher assignments. The Excel importer also accepts
   a school-strength workbook with columns CLASS, TOTAL STUDENTS, CAT-V STUDENTS
   and TOTAL ST STUDENTS. It reads class figures for VI–XII, ignores summary/chart rows, requires
   every currently selected class and preserves teacher assignments. Only selected
   classes appear in the task; figures for other imported classes remain available
   if the Principal later selects them. Counts are parsed locally;
   only saving the draft sends the validated figures to the protected API. Missing values remain **Unprovided**; zero is an explicitly supplied
   figure. Import validates the entire file before changing the form. For example
   (illustrative structure only; use the actual figures privately):

   ```json
   {"IX A":{"total":null,"catV":null,"st":null}}
   ```

   Question edits and new questions are saved with the draft and require Publish.
   Older reports retain the question wording/count type captured at submission;
   legacy reports without a captured question list use the original 16 questions.
   Consolidated totals follow saved draft questions and exclude earlier answers
   to changed questions until the assigned teacher reviews and resubmits them.
   Unchanged answers remain available; newly added questions start unconfirmed.

3. Instruction visibility remains a draft setting. The public Task manager list
   now shows every published task's title, mentor/support list and class status,
   including concerned-staff tasks, as explicitly requested by the Principal.
   The **questionnaire and instructions require the assigned mentor's PIN** in
   both visibility modes. This list never exposes class figures, answers,
   remarks, Principal comments or private draft changes. Stop publication hides
   the task and its list entirely.
4. **Save private draft**, then **Publish** when ready. Publishing uses the saved
   draft. Further edits stay private until published again. Time-bound priority
   requires a deadline; the first two priorities do not invent one.
5. Review submitted/pending classes, per-class reports and per-field totals.
   Every total lists its supplying and missing classes. Header totals use supplied
   class figures; survey totals use the latest saved report per class. Categories
   overlap and must not be added into a unique-student total. PTMs count meetings.
   Examination context is visible on each class report.
6. The Principal comment after the results is private. **Stop publication** hides
   the task from staff while retaining reports and comments. Re-publishing the
   saved task restores assigned-class access.

## Staff workflow and validation

Open Staff view to see published titles and the public class table without a
curtain password or PIN. The Task 1 prime mentor / survey IC and technical support
list comes from the Principal's supplied document. Click **Start & Submit Now**
for your class and enter that assigned mentor's existing personal PIN. The
questionnaire then opens as a full-page form with a Back to task list button.
Only the selected class is returned by the scoped PIN-read request. Technical
support names are informational and do not independently authorize submissions.

Existing explicit Principal assignments take precedence. For Task 1 only, missing
assignments can be resolved from the supplied mentor list using exact documented
names/aliases and verified linked identities; ambiguous matches require Principal
assignment. On the first authorized save those defaults are retained; subsequent
explicit assignment removals are respected. No new PINs or staff profiles are
created. The public task list reports submitted/pending status without showing
questionnaire data. Mobile layout uses compact text, stacked list rows and a
full-width form with readable inputs and touch-sized action buttons.

Each class form has a read-only enrollment, Cat-V and ST header. Teachers cannot
submit header changes. Supply the latest
examination's name/context and aggregate counts only. Teachers enter counts directly in plain number cells, without dropdowns.
Leave a cell blank for **Not available / unconfirmed**; unknown counts are excluded from totals rather
than treated as zero. Do not enter student names, locations or identifying
family/health information. Teacher reports end with **Overall situation — comments by CT / Prime mentor /
Survey IC**, an optional text box for class-level
perspectives, reasons for difficulties in academic progress and suggested support
(up to 2,000 characters). Remarks must not contain student names or identifying
family/health information. They remain private to the Principal and the currently
assigned teacher, appear after the counts in each class report, and are excluded
from totals and broad staff payloads. Teachers can edit or clear them using their
existing PIN. Extra arbitrary report fields are rejected server-side.

Student counts cannot exceed supplied enrollment; passed + failed cannot exceed
it either. PTMs are independently validated meeting counts. Where enrollment is
unprovided, the UI says enrollment checks are not yet possible. Later supplied
enrollment is checked against existing reports before saving/publishing.

Each save requires the existing PIN again. Updates replace the report keyed by
class, with a revision check to reject stale saves. No duplicate class report is
created. Current published assignments determine access; reassigning and
publishing removes the old teacher's access and grants the new teacher access
to the retained class report. Private draft edits/comments do not invalidate a
teacher's currently published form. Publication changes require a refresh.
Saves retain the relevant form. Unsaved forms participate in the existing
deployment-update guard, navigation confirmations and before-unload protection.

## Storage and deployment boundary

Everything is under **`cbse/taskManager`**, outside `cbse/mission`, broad shared
view payloads, public snapshots, and Office/SF/VVN, Roll Call and Leave/OD data.
Realtime Database rules explicitly deny direct client reads and writes to this
namespace. Existing default-deny rules also protect it when no broader ancestor
grant exists. Merge the supplied deny-only child into your actual rules if
needed; do not overwrite unrelated production rules. The server uses the
existing `FIREBASE_SERVICE_ACCOUNT_JSON` credential and checks the configured
Principal UID, existing enabled PIN, active staff identity, class assignment,
publication state and report/task revisions. Existing PIN throttling applies.
There is no new service account, auth provider, PIN system or environment variable.

Vercel must deploy the updated `api/staff-access.js`, `_server` modules and the
generated static site together. A Python static HTTP server cannot execute the
real API. No live draft creation, rules publication, Git push or production
deployment is implied by local validation. The onboarding machine has no live
Firebase service-account credential, so Task 1 is delivered as the server-side
creation operation plus the private importable template.

## Local validation

From the repository with Node 22 and locked dependencies installed:

```sh
export PATH=/workspace/.tooling/node_modules/node/bin:$PATH
node --test --test-concurrency=2 tests/*.test.mjs
npm run build
python3 tests/task-manager-browser.py
```

The browser test starts and stops its own synthetic HTTP backend on port 8012,
uses the real task service and PIN hashing with a synthetic database, and mocks
only Firebase identity. Task-list, PIN-read and submission calls use the real service. It checks Principal session
reuse, draft creation, assignments/figure import, publication, teacher PINs,
read-only figures, report replacement, totals, comments, layout, unsaved code
update protection and logout. Node tests cover invalid counts, wrong identities,
unassigned classes, disabled PINs, stale writes, confidential payload filtering,
publication retention, direct-client rule denial and build-output exclusions.
These checks do not replace verification of a deployed Firebase/Vercel instance.
