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

- [x] Add teacher notification read/unread query and mark-read procedure
- [x] Add assignment due-date editing and validation in teacher workflow
- [x] Add UI controls for unread notification state and due-date management
- [x] Add tests and browser verification for notification and due-date flows
- [x] Save and deliver the next-phase checkpoint

- [x] Add backend coverage for assignment due-date create/update behavior
- [x] Run browser verification after notification and due-date UI changes
- [x] Save and deliver a checkpoint for the notification and due-date phase

- [x] Confirm Supabase project URL and publishable/anon key
- [x] Add Supabase browser and server authentication configuration
- [x] Replace Manus OAuth UI login with Supabase email/password session handling
- [x] Bridge Supabase users to the existing users table and classroom roles
- [x] Preserve teacher/student authorization boundaries under Supabase sessions
- [x] Add Supabase auth tests and update migration documentation
- [x] Validate sign-in, sign-out, and protected classroom API access
- [x] Save and deliver the Supabase authentication migration checkpoint

- [x] Add Supabase token-to-local-user mapping tests and role enforcement coverage
- [x] Remove remaining Manus-specific authentication dependency from runtime paths
- [x] Document that live Supabase sign-in verification requires a configured test account and browser session

- [x] Remove legacy Manus storage keys from the Supabase auth hook
- [x] Add explicit Supabase-backed role-enforcement coverage
- [x] Document the interactive browser-session limitation for live Supabase sign-in verification

- [x] Test createContext with a mocked Supabase getUser response and local role lookup, then enforce the resolved role through a protected procedure

- [x] Add protected profile read/update procedure for students and teachers
- [x] Add profile page with role-aware account details and editable fields
- [x] Add Supabase password-reset request and update-password screens
- [x] Add Supabase email-verification status and resend flow
- [x] Add profile and auth-flow tests
- [x] Verify the account-management UI and save a checkpoint
