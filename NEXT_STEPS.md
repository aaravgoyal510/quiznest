# Next Steps & Planned Phase 4 Scope

This document details the unstarted requirements for **Phase 4 (Optimization, Tests & Polish)**. The incoming development team (or AI coding agents) should execute these tasks to complete the project for release.

---

## 1. Phase 4 Unstarted Requirements

### Task 1: Real Email Password Reset
* **Current State**: `requestPasswordResetAction` generates a secure token and logs the reset link to the server console. No email is sent.
* **Requirements**:
  * Integrate an email service provider client (e.g., **Resend**, **Nodemailer**, or **SendGrid**).
  * Load credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` or API keys) from environment variables.
  * Create a clean HTML email template for password reset instructions.
  * Update the action to send the email and handle network delivery failures gracefully.

### Task 2: Error Monitoring & Logging
* **Current State**: Server errors are logged to the console via standard `console.error` logs. No runtime aggregation exists.
* **Requirements**:
  * Integrate **Sentry.io** (or an equivalent logging aggregator like Logtail / Axiom).
  * Configure `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` in Next.js.
  * Wrap critical server actions and middleware calls to track unhandled exceptions automatically.
  * Ensure user PII (like passwords) is filtered out of Sentry event metadata.

### Task 3: Automated Integration Tests
* **Current State**: Stress testing was done via local JS scripts. No automated unit/integration test suites exist in the repository.
* **Requirements**:
  * Install and configure **Playwright** or **Cypress** for end-to-end testing.
  * Create test cases covering the critical user path:
    * User registration and login validation.
    * Student starting a quiz attempt.
    * Answering questions (confirming debounced saves update the database).
    * Telemetry focus/blur tracking increments defocus counters.
    * Finalizing attempt and verifying scores are calculated correctly.
  * Configure these tests to run in a CI/CD pipeline (e.g., GitHub Actions).

### Task 4: Professional Developer `README.md`
* **Current State**: The repository does not have a comprehensive root `README.md` explaining operational architecture and coding guidelines.
* **Requirements**:
  * Create a root `README.md` containing architectural overviews, quick-starts, project configurations, and a guide to adding new database models.

### Task 5: Mobile Responsiveness Audit & Fixes
* **Current State**: Layouts and sidebars are styled primarily for standard desktop widths (>= 1024px).
* **Requirements**:
  * Conduct a UI audit on screen sizes under 768px (tablets and mobile phones).
  * Update the navigation sidebar (`Sidebar.tsx`) to support collapsible slide-out drawer views on mobile devices.
  * Optimize the quiz runner workspace page (`QuizRunner.tsx`) so that questions, choices, timers, and telemetry warnings adjust seamlessly on mobile screens.

### Task 6: Bulk Question Import (CSV/Excel)
* **Current State**: Teachers must add questions manually one-by-one in the question editor.
* **Requirements**:
  * Add a "Bulk Upload" button in the teacher questions dashboard.
  * Support file uploads for CSV/Excel format.
  * Add validation parsing using Zod to verify headers and choices schema before database writes.
  * Use a Prisma transaction to batch-insert imported questions to the database.

### Task 7: Exportable PDF Result Summaries
* **Current State**: Students can view their result scores in the dashboard, but cannot download them.
* **Requirements**:
  * Add a "Download Result PDF" button in the student attempts score panel.
  * Integrate a PDF generation library (e.g., `@react-pdf/renderer` or `puppeteer-core` serverless rendering).
  * Generate a clean, branded PDF report card listing subject details, date submitted, scoring metrics, and tab switch telemetry logs.

---

## 2. Pre-Deployment Checkpoints (Unverified Gaps)
* **Live Load Testing**: The 60 concurrent VUs stress-test was executed locally. Once deployed on Vercel, the team must run the load test script (`node scratch/load-test.js`) targeting the deployed live URL to verify that:
  * Network latencies between Vercel serverless containers and the Supabase database are minimized (< 5ms).
  * Supabase Free Tier PgBouncer limits handle 120 parallel serverless sockets without connection pool timeouts.
