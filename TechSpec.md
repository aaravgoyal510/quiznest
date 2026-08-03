# Technical Specifications

This document outlines the technical design, protocols, state machines, and implementation details for security and concurrency features.

---

## 1. Authentication & Session Security

### A. Session Flow (Next-Auth v5)
The portal uses Next-Auth v5 credentials-based authentication with a JWT session storage strategy.
* On successful credential verification:
  * The server returns custom session payloads (User ID, Name, Email, Role, Department, Year, `tokenVersion`).
  * Session token expiration is locked to **4 hours** (`maxAge: 4 * 60 * 60`) to enforce exam security bounds.

### B. Session Version Invalidation Cache (TTL check)
To prevent constant database read operations on every request, the `jwt` callback in `src/lib/auth.ts` implements a 60-second point-lookup cache:
1. When the JWT token is generated, the initial timestamp `lastCheckedVersionAt = Date.now()` is cached in the token payload.
2. For subsequent requests, the server checks if `Date.now() - lastCheckedVersionAt > 60 * 1000` (60 seconds).
   * **If false (Cache Hit)**: Skips the database lookup.
   * **If true (Cache Miss)**: Queries the database `prisma.user.findUnique` to retrieve the current `tokenVersion`.
3. If the retrieved `tokenVersion` matches the JWT's version, `lastCheckedVersionAt` is updated to the current time, and the request succeeds.
4. If a mismatch is detected (e.g. user updated their password on another device, incrementing `tokenVersion`), the callback returns `null`, immediately destroying the session cookie.

---

## 2. Database Connection Pooling Constraints
To protect Supabase's Free Tier connection limits, the app restricts the PostgreSQL connection budget:
* **Connection Strings (`.env`)**:
  * `DATABASE_URL`: Appended with `&connection_limit=2&pool_timeout=15` to limit the connection pool size and prevent serverless cold-starts from crashing the pooler.
  * `DIRECT_URL`: Directly maps to port `5432` for administrative commands (`prisma db push`).

---

## 3. Rate-Limiting Mechanics
* **Login Attempt Protection**:
  * Managed via `checkRateLimit` (Prisma-backed counters).
  * Limits users to **5 failed login attempts within a 10-minute window**. If exceeded, the account is locked for the remaining duration.
* **Autosave Traffic Throttling**:
  * Clients use a 1000ms debounce buffer combined with `onBlur` listeners to capture changes.
  * Every answer submission action is validated against a server-side limit of **60 saves per minute per attempt**. Requests exceeding this are throttled, preventing script-based answer injection.

---

## 4. Telemetry & Focus Tracking
* **Client Monitoring (`QuizRunner.tsx`)**:
  * Monitors user window focus events.
  * When a `window.blur` event triggers, it increments a local switch counter and records the time focus was lost.
  * On `window.focus`, it calculates the duration spent unfocused and triggers a background Server Action `updateTelemetryAction` to save `defocusCount` and `defocusDurationSeconds` to the database.
* **Real-time Synchronization**:
  * Every 2 seconds, the teacher dashboard fetches progress reports from `/api/teacher/quizzes/[id]/progress`.
  * Telemetry indicators are fetched and rendered. If a student's `defocusCount` exceeds 3, the progress card turns red, flagging potential tab-switching abuse.

---

## 5. Storage Architecture (Profile Pictures)
Profile avatars are stored in Supabase Storage under the `avatars` bucket:
* **Storage Actions (`src/lib/storage.ts`)**:
  * High-privilege access keys (`SUPABASE_SERVICE_ROLE_KEY`) are kept on the server and never exposed to the client.
  * File uploads and deletions are triggered strictly from Server Actions (`updateAvatarAction` and `deleteAvatarAction`).
  * Before modifying files, the action re-authenticates the user identity server-side via the active session.
  * **File Path Isolation**: Uploaded files are named using unique UUID prefixes (e.g. `avatars/[userId]/[uuid].jpg`) to prevent directory traversal and name collision vulnerabilities.
