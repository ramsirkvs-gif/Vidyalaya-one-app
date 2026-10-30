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
   with sign-in kept in the current browser session and an explicit Sign out.
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
new password through Firebase Authentication, then signs out. Sign in to the
portal with the new password. There is no email field. The new password must meet
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
