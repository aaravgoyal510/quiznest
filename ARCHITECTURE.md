# Architecture Overview

This document describes the codebase folder organization, database schema relationships, routing layout, and the security model of the quiz portal.

---

## 1. Directory Structure Map
Below is a map of the primary folders in the repository and their purpose:

```
quizapp/
├── prisma/                  # Prisma Database schema, migrations, and seeding scripts
├── public/                  # Static assets (images, icons, etc.)
├── scratch/                 # Load test scripts and temporary debug configurations
├── src/                     # Core application source code
│   ├── app/                 # Next.js App Router folders and layout configs
│   │   ├── (admin)/         # Grouped pages restricted to ADMIN role users
│   │   ├── (auth)/          # Authentication pages (login, reset-password, etc.)
│   │   ├── (student)/       # Student dashboard and quiz taking views
│   │   ├── (teacher)/       # Teacher dashboard, quiz creation, and results
│   │   ├── api/             # REST API endpoints (auth callbacks, load tests)
│   │   └── profile/         # User self-service profile page
│   ├── components/          # Reusable shared UI components
│   │   ├── layout/          # Layout modules (Sidebars, wrappers)
│   │   └── student/         # Student components (timer overlays)
│   ├── lib/                 # Core utilities, libraries, and validation rules
│   │   ├── validations/     # Zod schemas for input validation
│   │   ├── auth.ts          # Next-Auth options, callbacks, and helpers
│   │   ├── db.ts            # Global Prisma Client singleton
│   │   └── storage.ts       # Supabase Storage client integration actions
│   └── proxy.ts             # Middleware logic for route guarding
└── vercel.json              # Vercel serverless deployment config
```

---

## 2. Server Actions & API Routes
The application uses Next.js Server Actions for forms and actions, alongside REST API endpoints for telemetry and testing.

### Admin Actions (`src/app/(admin)/admin/actions.ts`)
* `createUserAction`: Creates a new user (student/teacher) in the system.
* `updateUserAction`: Updates name, email, department, year, or role for a user.
* `deleteUserAction`: Deletes a user and cascades all related dependencies.
* `createSubjectAction`: Adds a new course subject.
* `deleteSubjectAction`: Removes a subject.

### Teacher Actions (`src/app/(teacher)/teacher/actions.ts`)
* `createQuizAction`: Registers a new quiz with scheduled time frames and durations.
* `updateQuizAction`: Modifies quiz metadata and publishes it.
* `deleteQuizAction`: Removes a quiz and related attempts.
* `createQuestionAction`: Adds a question to the question bank.
* `deleteQuestionAction`: Removes a question.

### Student Actions (`src/app/(student)/student/actions.ts`)
* `startQuizAttemptAction`: Creates a new attempt record, generates an `activeSessionToken`, and marks the start time.
* `updateTelemetryAction`: Periodically updates student focus switches and blur time.
* `submitQuizAnswerAction`: Saves a single answer to a question (debounced client-side, rate-limited server-side).
* `finalizeQuizAttemptAction`: Computes score, records end time, and finalizes the attempt.

### Profile Actions (`src/app/profile/actions.ts`)
* `updatePasswordAction`: Validates the current password and sets a new one, incrementing the user's `tokenVersion`.
* `updateAvatarAction`: Uploads a profile picture to Supabase storage and updates the user's `avatarUrl`.
* `deleteAvatarAction`: Removes the avatar file from Supabase and clears `avatarUrl`.

### API Router Endpoints
* `GET /api/auth/[...nextauth]/route.ts`: Exposes Next-Auth handler endpoints (`GET` / `POST`).
* `GET /api/teacher/quizzes/[id]/progress/route.ts`: Exposes real-time telemetry updates for active student taking lists.
* `POST /api/teacher/results/export/route.ts`: Returns CSV data summaries of quiz results.
* `POST /api/test/quiz-flow/route.ts`: Helper endpoint for concurrent load testing.

---

## 3. Database Schema Overview
The database uses PostgreSQL (hosted on Supabase).
* **`User`**: Base profile record containing credentials (`passwordHash`), system role, and `tokenVersion` (for session invalidation).
* **`Subject`**: Academic categories created by teachers to group questions and quizzes.
* **`Question`** & **`QuestionOption`**: Reusable question bank items. Supports MCQ (multiple-choice options), True/False, and Short Answer types.
* **`Quiz`** & **`QuizQuestion`**: Scheduled exam containers linking questions in a specific order.
* **`QuizAttempt`**: Tracks a student's instance of taking a quiz. Stores the `activeSessionToken`, timestamps (`startedAt`, `submittedAt`), score, and defocus telemetry.
* **`Answer`**: Tracks the student's selected options or typed answers for questions during a quiz attempt.
* **`AuditLog`**: Stores administrative and grading events for audit trails.
* **`PasswordResetToken`**: Stores secure UUID tokens and expiration dates for password recovery.

---

## 4. Security Model
The system protects resources through multiple layers:
1. **Next.js Router Middleware (`src/proxy.ts`)**: Automatically gates pages according to user roles. If unauthenticated, it redirects to `/login`.
2. **Server-Side Action Security (`requireRole`)**: Every server action calls `requireRole` to verify that the logged-in user session matches the allowed roles.
3. **Session Token Lockdown**: In `student/actions.ts`, every answer save or attempt finalization checks if the incoming request's `activeSessionToken` matches the attempt record in the database. If they mismatch, the action rejects immediately.
4. **Token Version Validation**: The `jwt` callback in `lib/auth.ts` uses a 60-second TTL cache to verify the user's `tokenVersion`. This automatically logs out hijacked sessions on other devices within 60 seconds if the user updates their password.
