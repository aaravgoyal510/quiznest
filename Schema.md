# Database Schema Specification

This document details the database schema models, database fields, relationships, indexes, and security counters defined in [schema.prisma](file:///c:/Users/admin/Desktop/web_dev/quizapp/prisma/schema.prisma) as of version 1.0.0.

---

## 1. Models and Fields

### A. `User`
Stores system accounts for students, teachers, and administrators.
* `id` (`String`, Primary Key): Unique identifier (CUID).
* `name` (`String`): The user's full name.
* `email` (`String`, Unique): Institutional email address.
* `passwordHash` (`String`): Password hash (Bcrypt).
* `role` (`Role`, Enum): User permissions (`ADMIN`, `TEACHER`, `STUDENT`).
* `department` (`String?`): Optional field to group users (e.g. "CSE").
* `year` (`String?`): Optional academic year (e.g. "3rd Year").
* `avatarUrl` (`String?`): Supabase Storage URL pointing to their profile picture.
* **`tokenVersion`** (`Int`, Default: `0`): **Security field**. Incremented on password change. Checked during JWT validation to invalidate concurrent sessions on other devices.

### B. `Subject`
Represents academic courses.
* `id` (`String`, Primary Key): CUID.
* `name` (`String`): Name of the course (e.g. "Data Structures").
* `code` (`String`, Unique): Unique catalog course code (e.g. "CS301").
* `createdById` (`String`): Foreign key referencing the `User` creator.

### C. `Question`
Represents question entities inside the institutional bank.
* `id` (`String`, Primary Key): CUID.
* `subjectId` (`String`): Foreign key referencing the related `Subject`.
* `text` (`String`): The question prompt text.
* `type` (`QuestionType`, Enum): Supports `MCQ` (multiple choice), `TRUE_FALSE`, and `SHORT_ANSWER`.
* `points` (`Int`, Default: `1`): Scoring weight.
* `createdById` (`String`): Foreign key referencing the `User` creator.

### D. `QuestionOption`
Stores multiple choices for MCQ and True/False questions.
* `id` (`String`, Primary Key): CUID.
* `questionId` (`String`): Foreign key referencing the parent `Question`.
* `text` (`String`): The text for the option choice.
* `isCorrect` (`Boolean`, Default: `false`): Flags if this choice is the correct answer.

### E. `Quiz`
Organizes scheduled exam details.
* `id` (`String`, Primary Key): CUID.
* `subjectId` (`String`): Foreign key referencing the related `Subject`.
* `title` (`String`): Title of the assessment.
* `description` (`String?`): Optional description of topics covered.
* `durationMinutes` (`Int`): Time limit for taking the quiz.
* `teacherId` (`String`): Foreign key referencing the `User` teacher.
* `startsAt` (`DateTime`): Scheduled window opening timestamp.
* `endsAt` (`DateTime`): Scheduled window closing timestamp.
* `isPublished` (`Boolean`, Default: `false`): Toggles student visibility.

### F. `QuizQuestion`
Join table mapping questions to quizzes with a custom sort ordering.
* `quizId` (`String`): Foreign key referencing the parent `Quiz`.
* `questionId` (`String`): Foreign key referencing the mapped `Question`.
* `order` (`Int`): Ordering index (1-indexed).

### G. `QuizAttempt`
Tracks a student's active or completed quiz session.
* `id` (`String`, Primary Key): CUID.
* `quizId` (`String`): Foreign key referencing the target `Quiz`.
* `studentId` (`String`): Foreign key referencing the taking `User`.
* `startedAt` (`DateTime`, Default: `now()`): The start timestamp.
* `submittedAt` (`DateTime?`): The submit/finalization timestamp.
* `score` (`Float?`): Points awarded.
* `timeSpentSeconds` (`Int?`): Total duration spent.
* **`activeSessionToken`** (`String?`): **Security field**. Tracks the unique token of the active browser tab. Prevents concurrent dual-login taking.
* **`defocusCount`** (`Int`, Default: `0`): **Telemetry field**. Total count of tab defocus events.
* **`defocusDurationSeconds`** (`Int`, Default: `0`): **Telemetry field**. Total time spent outside the exam tab.
* **`answersCount`** (`Int`, Default: `0`): **Cached counter field**. Stores the current count of questions answered. Eliminates SQL join COUNT operations for dashboards.

### H. `Answer`
Tracks student answers for each question during an attempt.
* `id` (`String`, Primary Key): CUID.
* `attemptId` (`String`): Foreign key referencing the parent `QuizAttempt`.
* `questionId` (`String`): Foreign key referencing the related `Question`.
* `selectedOptionId` (`String?`): Foreign key referencing `QuestionOption` (for MCQ/True-False).
* `textAnswer` (`String?`): The typed string response (for Short Answer).

### I. `AuditLog`
Stores system events for compliance trails.
* `id` (`String`, Primary Key): CUID.
* `userId` (`String`): Foreign key referencing the executing `User`.
* `action` (`String`): Type of event (e.g. `DELETE_QUIZ`, `CREATE_USER`).
* `details` (`String`): Plain English description of changes.
* `createdAt` (`DateTime`, Default: `now()`): Timestamp.

### J. `PasswordResetToken`
Manages secure password reset tokens.
* `id` (`String`, Primary Key): CUID.
* `email` (`String`): Mapped user email.
* `token` (`String`, Unique): Secure random token string.
* `expiresAt` (`DateTime`): Expiration timestamp.

---

## 2. Relationships Map
* `User` has a **one-to-many** relationship with `QuizAttempt` (one student has multiple attempts).
* `Quiz` has a **one-to-many** relationship with `QuizAttempt` (one quiz has multiple student attempts).
* `QuizAttempt` has a **one-to-many** relationship with `Answer` (an attempt contains answers to questions).
* `Question` has a **one-to-many** relationship with `QuestionOption` (a question contains choices).
* `Quiz` has a **one-to-many** join table relationship with `QuizQuestion` (which maps to `Question`).

---

## 3. Database Index Optimizations
To ensure high performance under concurrency, targeted indexes are defined on model schemas:
* **`QuizAttempt` Indexing**:
  `@@index([submittedAt])`
  *Optimizes teacher dashboards and result analytics queries when filtering active vs. graded completions.*
* **`AuditLog` Indexing**:
  `@@index([createdAt])`
  *Optimizes paginated administrative logs queries, accelerating audit log sorting.*
