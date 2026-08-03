# Changelog

All notable changes to the Quiznest Online Quiz Management Portal are documented in this file.

---

## [1.0.0] - 2026-08-01 (Phases 1-3 Completed)

### Phase 1: Core Portal Structure
* **Authentication Setup**: Integrated Next-Auth v5 credentials-based authentication supporting custom user fields (email, name, role, department, year).
* **Role-Based Workspaces**:
  * **Admin Panel**: Added screens to manage students/teachers, subjects, and inspect system audit logs.
  * **Teacher Panel**: Created interfaces to manage assessments, define question banks (MCQ, True/False, Short Answer), and view graded student results.
  * **Student Panel**: Built dashboard to view active quizzes and past scores.
* **Routing Security**: Added a custom proxy middleware routing gate (`proxy.ts`) to restrict layout branches according to authenticated user roles.

### Phase 2: Telemetry & Real-Time Tracking
* **Paced Quiz Runner**: Implemented a stateful student quiz client workspace with quiz timers, automatically tracking exam pacing.
* **Autosave Engine**: Designed a client-side debounced answer save module (1000ms delay + `onBlur` events) linked to server-side updates.
* **Anti-Cheat Telemetry**: Configured blur detection listeners (`window.onblur` / `window.onfocus`) to track:
  * Tab defocus switches count (`defocusCount`).
  * Total duration spent unfocused (`defocusDurationSeconds`).
* **Real-time Live Progress Dashboard**: Added a teacher-facing live-monitoring screen showing active student exam timers, questions answered, and tab switches in real time.

### Phase 3: Database & Security Hardening
* **Dual-Login Session Guard**: Implemented `activeSessionToken` locking in `QuizAttempt`. Starting an attempt locks it to the current browser session, invalidating any concurrent logins or tabs immediately.
* **Password Session Invalidation**: Integrated a `tokenVersion` check in Next-Auth JWT callbacks. Changing a password increments `tokenVersion`, invalidating all active cookies on other devices within a 60-second cached window.
* **Performance Indexing**: Added database indexes to schema models:
  * `@@index([submittedAt])` on `QuizAttempt` to accelerate dashboard loading.
  * `@@index([createdAt])` on `AuditLog` to optimize administrative logs pagination.
* **Connection Pool Optimization**: Constrained local database URLs to `connection_limit=2` to protect Supabase PgBouncer limits in production.
* **Load Test Framework**: Created `scratch/load-test.js` to simulate 60 concurrent VUs executing paced sequential quiz flows.

---

## [Planned] - (Phase 4 Pending)
* For the unstarted Phase 4 scope (Real email sending, Sentry logging, Cypress tests, mobile responsiveness fixes, PDF results, bulk import), see [NEXT_STEPS.md](file:///c:/Users/admin/Desktop/web_dev/quizapp/NEXT_STEPS.md).
