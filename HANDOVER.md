# Project Handover Documentation

This project is an **Institutional Online Quiz Management Portal** designed for web-based academic assessments. It supports three distinct user roles (Admin, Teacher, and Student) with specific workspace panels, real-time taking, and security verification.

---

## 1. Project Summary & Target Audience
* **Target Audience**: Educational institutions, professors/teachers administering tests, and students taking timed assessments.
* **Workspace Roles**:
  * **Admin**: Responsible for managing users (students and teachers), managing subject courses, and viewing audit logs.
  * **Teacher**: Responsible for managing quizzes, creating questions, tracking real-time student progress during tests, and reviewing student scores.
  * **Student**: Responsible for taking published quizzes within scheduled windows, saving progress, and viewing their results.

---

## 2. Technology Stack & Versions
The portal is built with the following core stack:
* **Next.js**: `16.2.12` (React 19 App Router)
* **React**: `19.2.4`
* **Prisma**: `5.19.1` (Object-Relational Mapping)
* **Next-Auth (Auth.js)**: `^5.0.0-beta.32` (Session security & authentication)
* **Database**: PostgreSQL (hosted on Supabase)
* **Styling**: TailwindCSS `^4` (Vanilla CSS customization structure)
* **State Management / UI Icons**: `lucide-react` icons and native React state.

---

## 3. Architecture & Core Design Decisions
* **Debounced Autosave (Quiz Runner)**: Students' quiz responses are automatically saved in the background with a 1000ms debounce buffer combined with `onBlur` listeners. This guarantees that network traffic is throttled to 1 query per second per student, preventing database connection exhaustion during high-concurrency exams.
* **Session Token Locking (`activeSessionToken`)**: To prevent dual-login cheating (multiple tabs or multiple devices taking the same quiz attempt concurrently), a quiz attempt is locked to a single `activeSessionToken`. If a student opens the test in another tab, the previous session is immediately invalidated, and a visual overlay blocks further action. same-tab page refreshes do **not** lock out the student because the token is persisted correctly.
* **Token Version Invalidation (`tokenVersion`)**: The user model tracks a `tokenVersion` number. If a user changes their password, `tokenVersion` is incremented. The next request decrypts the user session JWT and compares its cached version with the DB. If it mismatches, the session is immediately invalidated, locking out other active sessions on different devices.
* **Anti-Cheat Telemetry**: Tracks student focus changes:
  * **`defocusCount`**: Stores how many times the student tab lost focus.
  * **`defocusDurationSeconds`**: Stores total time spent out of focus.
* **Denormalized Progress Counters**: Cache columns like `answersCount` inside the `QuizAttempt` table to prevent heavy COUNT SQL queries when teachers query real-time dashboards.

---

## 4. Environment Variables Audit
Add these variables to the Vercel dashboard and local `.env` files:

* **`DATABASE_URL`**: Pooled connection URL (Supabase PgBouncer port `6543`) with `connection_limit=2&pool_timeout=15`.
* **`DIRECT_URL`**: Direct connection URL (Supabase port `5432`) used by local CLI commands (`prisma db push`, `db seed`).
* **`AUTH_SECRET`**: A secure 32-byte secret used to sign and encrypt Next-Auth cookies.
* **`AUTH_TRUST_HOST`**: Set to `true` on Vercel deployments to trust host proxy headers and prevent `UntrustedHost` errors.
* **`SUPABASE_URL`**: Supabase project URL (e.g. `https://xxx.supabase.co`) for avatar uploads.
* **`SUPABASE_SERVICE_ROLE_KEY`**: Supabase high-privilege service role key (must **NOT** be public) for bucket writing/deletion.

---

## 5. Local Setup Instructions
To run the project locally:
1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd quizapp
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   * Create a `.env` file in the root folder using the keys listed above.
4. **Push Database Schema**:
   ```bash
   npx prisma db push
   ```
5. **Seed the Database**:
   ```bash
   npx prisma db seed
   ```
   * *Seeded Logins*:
     * Student: `student@institution.edu` (Pass: `Student123!`)
     * Teacher: `teacher@institution.edu` (Pass: `Teacher123!`)
     * Admin: `admin@institution.edu` (Pass: `Admin123!`)
6. **Start the Dev Server**:
   ```bash
   npm run dev
   ```
   * Open `http://localhost:3000` to interact.

---

## 6. Deployment Configuration
* **Hosting Platform**: Vercel
* **Region Routing**: Configured in [vercel.json](file:///c:/Users/admin/Desktop/web_dev/quizapp/vercel.json) to `bom1` (Mumbai) to colocate serverless instances next to the Supabase database.
* **Build Command**: `npm run build`
* **Postinstall Step**: Package scripts automatically trigger `prisma generate` on dependency install to ensure Prisma Client type safety.

---

## 7. Current Project Completion Status
* **Phase 1: Core Portal Structure**: **100% COMPLETE**. Base views, router segments, and client layouts.
* **Phase 2: Exam Telemetry & Real-Time Tracking**: **100% COMPLETE**. Debounced runner, live telemetry, and teacher progress views.
* **Phase 3: Database & Security Hardening**: **100% COMPLETE**. Session locking, version caches, and indexes.
* **Phase 4: Optimization, Tests & Polish**: **NOT STARTED**. 

### Phase 4 Pending Requirements (Unstarted Scope):
1. **Real Email Password Reset**: Replace server console logging with a SMTP/Resend driver.
2. **Error Monitoring**: Integrate Sentry.io or equivalent runtime logging.
3. **Automated Tests**: Critical path integration tests (login, quiz attempt flow).
4. **Professional `README.md`**: Create developer guidelines.
5. **Mobile Responsiveness**: Audit CSS and fix layouts for screens under 768px.
6. **Bulk Question Import**: Teachers import questions using CSV/Excel upload.
7. **Exportable PDF Summary**: Students export result score sheets to PDF format.

---

## 8. Known Limitations of the Current System
* **Local Stress Testing**: Concurrency load tests (60 VUs) were executed and verified locally. Live-deployment concurrency and scale depend on Supabase free tier PgBouncer limits and must be verified after deployment.
* **Simulated Mail Delivery**: Password reset token generation works, but links are printed to the console rather than emailed.
