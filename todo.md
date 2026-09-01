# Project TODO

- [x] Define teacher-owned classroom, short join code, membership, and curriculum level data model
- [x] Define assignment model and teacher-only assignment management rules
- [x] Define student project model with HTML, CSS, JavaScript, browser-draft metadata, and assignment linkage
- [x] Define immutable timestamped submission snapshot model
- [x] Define minimal teacher progress aggregation fields and privacy boundaries
- [x] Add database schema and generate migration SQL
- [x] Apply and verify database migration
- [x] Add database query helpers with ownership-safe access patterns
- [x] Add teacher-protected classroom create/list/update procedures
- [x] Add teacher-protected assignment create/list/update procedures
- [x] Add authenticated student join-by-code procedure with short-code validation
- [x] Add student-owned project save/read procedures with browser-draft sync metadata
- [x] Add immutable server-side submission procedure with duplicate/idempotency protection
- [x] Add teacher-only assignment progress aggregation procedure
- [x] Add teacher submission notification with optional summary and no unnecessary student data
- [x] Build authenticated student classroom UI for joining classes and managing projects
- [x] Build authenticated teacher UI for classes, assignments, and progress
- [x] Add Vitest coverage for class-code joining and invalid/duplicate codes
- [x] Add Vitest coverage for teacher/student authorization boundaries
- [x] Add Vitest coverage for project saving and ownership isolation
- [x] Add Vitest coverage for immutable submission snapshots and timestamps
- [x] Add Vitest coverage for teacher progress aggregation
- [x] Run type-check, tests, and browser verification
- [x] Save final project checkpoint and deliver version

- [x] Add submission idempotency key and same-snapshot duplicate protection
- [x] Implement teacher-targeted submission notifications with optional summary content
- [x] Render student saved-project list and reopen/manage flow
- [x] Add positive duplicate class-join, project save/read, timestamp, immutability, and aggregation tests
- [x] Perform authenticated teacher and student workflow verification

- [x] Pass a stable client-generated idempotency key through the student submit flow and deduplicate identical snapshots server-side
- [x] Add deterministic aggregation contract test and stronger append-only submission assertions (persistence-level validation remains an acceptance task)
- [x] Document authenticated teacher/student workflow verification limitation
