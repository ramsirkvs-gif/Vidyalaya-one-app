# MCQs महाअभियान — shared Class X A/B/C/D bank

Open staff view or sign in as Principal, then choose **MCQs महाअभियान** in the portal navigation.

1. **Question bank:** anyone in the active staff/support roster with a personal PIN may contribute exactly 10 or 20 questions. Select a contributor; a single saved Class X subject assignment is inferred, otherwise select the subject. Choose a suggested/saved chapter, Mixed, or Add topic. Paste numbered questions with A), B), C), D) options and a separate numbered answer strip. Process, review/edit every question and correct-answer selector, verify, and enter that contributor's PIN. Questions receive permanent `M10-` IDs and an attributed `B10-` batch. Questions are immutable; a revised contribution receives new IDs. Save-request IDs make retrying an acknowledged/lost-response submission idempotent.
2. **Create QP:** any active teacher/member may reuse another contributor's batch or select 10/20 questions from multiple batches in the same subject. Nothing is removed/reserved from the bank. A `QP10-` paper freezes question order/content/key. Print/save the A4 paper, without an answer key, using the browser print dialog. The QR payload contains only `VOA|MCQ|<paper ID>`. A standardized bubble response strip is included.
3. **Evaluation:** select/scan the test ID, section and an enrolled student. Enter responses manually or photograph/crop the printed response strip including all four black corner squares. Verify that the photo belongs to the loaded test. Blank/double/unclear marks are flagged; arbitrary handwriting is not automatically graded. Review every response and selected student, then submit with the evaluator's own PIN. Grading uses the server's frozen key. The result is saved atomically with an MCQ practice exam/mark in the student's academic record. Duplicate results are rejected. Explicit correction requires Principal authentication AND the evaluator PIN, and keeps a private previous-result audit.

## Photos and OCR

Take/upload a photo, optionally drag-crop, then use it as a question diagram or read text into the notepad. Common math symbols are available. OCR uses bundled English/Hindi Tesseract models locally; it is not a mathematical typesetting engine. Always correct equations, symbols and OCR text. Diagrams may remain images; never upload marked solutions or answer-key screenshots as question diagrams. Image rasterization drops camera metadata. Evaluation photos are kept privately with the result.

Photo-assisted bubble reading supports the generated response strip, with perspective alignment from its four black squares. Dark, clearly filled single marks work best. Retake blurred/rotated/obscured photos or enter responses manually. Even confident reads require explicit human review; scans never auto-submit.

## Storage and access

The private bank, frozen paper keys, evaluations, evidence and correction audit live under `cbse/mcq`, outside `cbse/mission` and the public publication snapshot. Existing database rules deny client access at this path; writes/reads use the authenticated/PIN-verifying server service and the existing protected Firebase server credential. Browse responses omit answer keys, PIN/access records, evaluation photos and audits. Public site builds contain only code and third-party QR/OCR assets, never school bank records. The ordinary Mission backup includes integrated academic marks but not this separate MCQ bank; authorized administrators must include `cbse/mcq` in private database backups.

Bank questions are paginated (20 per page). Saved paper lists show the latest 100; any older printed paper remains loadable by its permanent test number.

## Build and validation

Node 22; `npm ci`; `npm run build`. Locked npm QR/OCR dependencies are copied by `scripts/prepare-mcq-assets.mjs` to ignored `vendor/mcq/` and included in generated `public/vendor/mcq/`. No CDN/OCR service is needed at runtime. Keep bundled licenses and package integrity checks intact.

Run `node --test tests/*.test.mjs`. Serve repository root on port 8000 and run `python3 tests/cbse-mcq-browser.py` and `python3 tests/cbse-mcq-ocr-browser.py` with Python Playwright and `/usr/bin/chromium`. These use synthetic data and do not establish production Firebase/Vercel readiness.
