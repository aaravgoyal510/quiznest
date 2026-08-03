# Application User Flows

This document details the step-by-step user journeys and operational flows for each role in the portal.

---

## 1. Student User Flows

### A. Dashboard & Quiz Discovery
1. Student logs in with their credentials at `/login`.
2. Redirected to `/student/dashboard`.
3. View list of "Active Quizzes Available".
4. If a quiz is published and the current time is between `startsAt` and `endsAt`, an "Enter Quiz" button is displayed.
5. If the student has already submitted the quiz, they see their score and percentage instead of the entry button.

### B. Timed Quiz Taking Lifecycle
1. Student clicks **"Enter Quiz"** or navigates to `/student/quiz/[quizId]/take`.
2. The page loads the server-side `startQuizAttemptAction`.
   * Checks if an attempt already exists.
   * If yes and it is submitted, redirects the student away.
   * If yes and it is active, retrieves the existing `activeSessionToken`.
   * If no attempt exists, creates one and generates a unique `activeSessionToken` (UUID).
3. The `QuizRunner.tsx` client workspace mounts and starts the countdown timer.
4. **Taking the Quiz**:
   * Student selects choices for MCQs/True-False, or types text for short answers.
   * Answer inputs trigger client-side React state updates.
   * A 1000ms debounce timer starts. If the student stops typing/changing choices for 1000ms (or focus is lost via `onBlur`), the client calls `submitQuizAnswerAction` to save the answer in the background.
5. **Anti-Cheat Monitoring**:
   * If the student switches browser tabs or opens another app, the browser fires `window.onblur`. The telemetry tracker starts counting the time out of focus.
   * When the student returns, the browser fires `window.onfocus`, records the blur duration, and calls `updateTelemetryAction` to save the updated tab switch count and time to the database.
6. **Double-Login Check**:
   * If the student opens another browser tab and tries to enter the same quiz attempt, the database generates a new `activeSessionToken`.
   * The original tab detects this change during its next telemetry/save sync. The screen is immediately blocked by a "Session Invalidated" overlay, preventing further input.
7. **Submitting the Quiz**:
   * **Manual Submit**: Student clicks the "Finalize & Submit" button. The runner calls `finalizeQuizAttemptAction` which calculates the final grade and marks `submittedAt = now`.
   * **Auto-Submit (Timer Expired)**: If the timer reaches `0:00`, the runner automatically blocks the page inputs, shows a "Time Expired" alert, and fires `finalizeQuizAttemptAction` with the current answers.
   * After submission, the database attempt and answer records remain, but are marked as submitted.

---

## 2. Teacher User Flows

### A. Quiz Creation
1. Teacher logs in and accesses `/teacher/dashboard`.
2. Clicks **"Create Assessment"** (navigates to `/teacher/quizzes/new`).
3. Fills out metadata: Title, Description, Subject, Duration, Scheduled Start, and Scheduled End dates.
4. Selects questions from the question bank to add to the quiz, defining their sorting order.
5. Clicks "Create Quiz".

### B. Monitoring Active Quizzes
1. Teacher goes to `/teacher/quizzes` and clicks on the active quiz.
2. Selects the **"Live Progress Tracker"** tab.
3. The dashboard polls `/api/teacher/quizzes/[id]/progress` every 2 seconds.
4. View real-time status card for each student:
   * Current status: "Active" (taking test) or "Completed" (submitted).
   * Progress bar (questions completed vs. total).
   * Active countdown timer.
   * Anti-cheat warnings: Highlighted red if the student has switched tabs more than 3 times.

### C. Reviewing & Exporting Results
1. Once a quiz is closed, the teacher navigates to `/teacher/quizzes/[id]/results`.
2. View scores, percentage, time spent, and telemetry violations for each student.
3. Clicks **"Export CSV"** to generate and download a spreadsheet containing student registration details, grades, and logs.

---

## 3. Admin User Flows

### A. User Management
1. Admin logs in and accesses `/admin/dashboard`.
2. Selects **"Manage Users"** (`/admin/users`).
3. Click "Add User", inputs Name, Email, Department, Year, Password, and Role (STUDENT or TEACHER).
4. Clicks "Save".
5. To modify, clicks "Edit" next to the user. Name, email, department, and role are editable.

### B. Audit Trail Inspection
1. Admin navigates to `/admin/audit-log`.
2. View pagination list of logs.
3. Audit records include: Action performed (e.g. `CREATE_USER`, `DELETE_QUIZ`), executing Admin name, and metadata details.

---

## 4. Self-Service User Flows (Profile Settings)
1. Any authenticated user (Student or Teacher) navigates to `/profile` (or clicks their avatar in the sidebar).
2. **Password Change**:
   * User enters Current Password, New Password, and Confirm Password.
   * System verifies the current password hash.
   * If correct, updates the password and increments `tokenVersion` by 1.
   * All other sessions for that user on other devices are immediately logged out within 60 seconds.
3. **Avatar Upload**:
   * User selects an image file.
   * System uploads the image file to the Supabase Storage `avatars` bucket under a unique UUID folder path.
   * Updates the user's `avatarUrl` column in the database.
