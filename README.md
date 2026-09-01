
## Validation scope

The backend currently passes TypeScript validation and the Vitest suite, covering role boundaries, short-code joining, duplicate joins, project ownership, successful project saves, immutable submission payloads, stable submission retries, teacher-targeted notifications, and progress-state aggregation. The managed preview was visually verified with an authenticated teacher session. A separate authenticated student session was not available in this run, so the final classroom acceptance check should use one teacher account and one student account to exercise join, save/reopen, submit, and teacher notification/progress flows end to end.
