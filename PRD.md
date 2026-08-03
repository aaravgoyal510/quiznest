# Product Requirements Document (PRD)

This document outlines the product requirements, target audience, and feature specifications for the Online Quiz Management Portal as implemented in version 1.0.0.

---

## 1. Purpose & Objectives
The portal is designed as a secure, high-concurrency academic assessment tool for educational institutions. The goal is to allow teachers to administer timed quizzes, track student progress in real-time, and log student tab-switching behavior to enforce exam integrity.

---

## 2. Target Users & Roles
The application supports three types of authenticated users:
1. **Student**: Accesses scheduled quizzes, submits answers, and views completed scorecard results.
2. **Teacher**: Designs assessments, builds reusable question banks, monitors active tests in real time, and exports scores.
3. **Admin**: Manages users, sets up courses, and reviews system audit logs for administrative oversight.

---

## 3. Core Features by Role

### A. Admin Panel Requirements
* **User Management**:
  * Create, update, and delete student and teacher accounts.
  * Define fields: Email, Name, Department, Year, and Role.
* **Subject Configuration**:
  * Set up and delete courses (e.g. "Data Structures & Algorithms" - `CS301`).
* **Audit Trails**:
  * View a system log detailing administrative actions (user creations, deletions, quiz completions) sorted by timestamp.

### B. Teacher Workspace Requirements
* **Question Bank Management**:
  * Create and delete questions linked to subjects.
  * Question Types: MCQ (Multiple Choice), True/False, and Short Answer.
* **Quiz Builder**:
  * Define quiz title, description, scheduled start and end dates, and duration in minutes.
  * Link questions in a custom order.
  * Publish toggle (quizzes must be published to be visible to students).
* **Live Progress Dashboard**:
  * Monitor real-time status of students taking the quiz.
  * Tracks: started at, time remaining, questions answered, tab defocus switches, and time defocused.
* **Results Export**:
  * Download quiz grades in CSV format.

### C. Student Portal Requirements
* **Active Assessments**:
  * View active published quizzes within their open time windows.
* **Quiz Runner Workspace**:
  * Displays active timer counting down the time remaining.
  * Auto-submits answers and locks input when the time expires.
  * Autosaves responses using a debounced 1000ms delay + `onBlur` listeners.
* **Anti-Cheat Monitor**:
  * Captures browser window defocus events. Logs total tab switch counts and duration.
* **Scorecards**:
  * View grades for completed quizzes showing points scored, percentage, time spent, and telemetry violations.

---

## 4. Non-Functional & Security Requirements
* **Authentication**: Credentials-based authentication secured by Next-Auth v5 JWT session cookies.
* **Dual-Login Protection**: Prevents a student from opening the same quiz attempt concurrently across different browsers or tabs.
* **Session Invalidation**: Forces instant logout of other active devices within 60 seconds if the user updates their password.
* **Performance/Scale**: Database pool limits capped to protect Supabase PgBouncer. High-concurrency writes optimized by debounced autosave.
* **Auditability**: Secure audit logging of critical actions.
