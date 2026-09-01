
## Validation scope

The backend currently passes TypeScript validation and the Vitest suite, covering role boundaries, short-code joining, duplicate joins, project ownership, successful project saves, immutable submission payloads, stable submission retries, teacher-targeted notifications, and progress-state aggregation. The managed preview was visually verified with an authenticated teacher session. A separate authenticated student session was not available in this run, so the final classroom acceptance check should use one teacher account and one student account to exercise join, save/reopen, submit, and teacher notification/progress flows end to end.

## Supabase Auth

Authentication now uses the Supabase Auth email/password flow. The browser persists and refreshes the Supabase session, tRPC forwards the access token as a Bearer header, and the server verifies the token through Supabase Auth before mapping the Supabase user ID to the local `users.openId` field. Classroom roles remain controlled by the local database; Supabase user metadata is not trusted for teacher/admin authorization. The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and no service-role key is required or exposed.

### Live authentication verification note

Live Supabase sign-in verification requires a configured test account and an interactive browser session. The automated checks validate Supabase endpoint configuration, Bearer-token extraction, identity mapping, and local role enforcement; they do not store or automate CAPTCHA completion or test-account passwords.
