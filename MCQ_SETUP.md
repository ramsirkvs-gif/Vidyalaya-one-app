# MCQs महाअभियान — shared Class X and Class XII banks

Open staff view or sign in as Principal, then choose **MCQs महाअभियान → Class X / Class XII**. Change class returns to the entrance. Banks, subject lists, paper selections and evaluation rosters stay within the chosen class. Existing records without a class field remain Class X; no migration or renumbering is required.

1. **Contribute 10 / 20 MCQs:** the prominent coloured button opens a PIN-protected contribution. The name list contains active subject teachers of the chosen class, including saved cross-class teaching allocations. A single saved subject allocation is inferred. Select a saved topic, Mixed or Add new topic. Paste ready numbered questions with A), B), C), D) options and a separate answer strip; alternatively upload one complete question photo per question, including all four options. Multiple photos can be selected together. Process, review the read-only previews, select/check correct answers, verify, then submit with the contributor’s PIN. To change pasted questions, replace the prepared text and process again. No mathematical editor or OCR correction is required.
2. **Create QP:** another eligible teacher can reuse any contribution in the selected class, or combine 10/20 questions from multiple batches of one subject. Nothing is removed/reserved. A paper freezes order/content/key. Print/save the A4 paper without an answer key using the browser print dialog. Whole-question photos print directly without duplicate placeholder options. The QR payload contains only `VOA|MCQ|<paper ID>`. A standardized bubble response strip is included.
3. **Evaluation:** select/scan the test ID, section and an enrolled student. Class X uses A–D; Class XII uses saved sections, including E. Enter responses manually or photograph/crop the printed response strip including all four black corner squares. Review every response and selected student, then submit with the evaluator’s PIN. Grading uses the server’s frozen key and saves the result atomically with an academic exam/mark. Duplicate results are rejected. Corrections require Principal authentication and evaluator PIN, with a private previous-result audit.

Class X IDs retain `M10-`, `B10-` and `QP10-`; Class XII uses independent `M12-`, `B12-` and `QP12-` counters. Save-request IDs prevent duplicate contributions/papers on retry. Questions are immutable; revised contributions receive new IDs.

## Current-session topics

The manifest is `cbse-mcq-syllabus.js`, session **2026–27**. The official source is https://cbseacademic.nic.in/curriculum_2027.html. Official network access was blocked during implementation, so no unverified chapter list is presented as current CBSE content. Until verified subject PDFs can be read, the dropdown honestly offers Mixed, saved subject topics and Add new topic. To complete official defaults, populate the class/subject manifest from the current official PDFs, retain their source references, and only then set `verified: true`. Do not substitute older syllabus lists silently.

## Photos

Upload complete ready questions, with optional replacement/cropping during review; diagrams may also be attached to pasted text questions. Never include marked solutions or visible correct-answer marks. Rasterization drops camera metadata. Photos and answer keys stay private. Photo-assisted bubble reading supports the generated response strip with perspective alignment from its four black squares. Retake blurred/obscured photos or enter responses manually. Scans require review and never auto-submit; arbitrary handwriting is not automatically graded.

## Storage and access

Private questions, frozen paper keys, evaluations, evidence and correction audits live under `cbse/mcq`, outside `cbse/mission` and public snapshots. Existing rules deny client access at this path; the server service checks protected staff browsing or Principal access and verifies PIN writes. Browse responses omit keys, PINs, evaluation photos and audits. Builds include only code and third-party QR assets. Ordinary Mission backups include integrated marks but not this separate bank; authorized administrators must include `cbse/mcq` in private database backups.

Bank reads paginate 20 questions. Saved paper lists show the latest 100; older papers remain loadable by their permanent test number.

## Build and validation

Use Node 22, `npm ci`, `npm run build`. Locked QR dependencies are copied to ignored `vendor/mcq/` and generated public assets with licenses; no external OCR service is used.

Run `node --test tests/*.test.mjs`. Serve the repository root on port 8000, then run `python3 tests/cbse-mcq-browser.py`, `python3 tests/cbse-mcq-staff-navigation-browser.py` and `python3 tests/cbse-mcq-photos-browser.py` using Python Playwright and Chromium. Tests use synthetic data and do not establish live Firebase/Vercel deployment readiness.
