# UI/UX Design System & Aesthetics

This document describes the design tokens, layout patterns, color schemes, and visual user experience cues used across the Online Quiz Portal.

---

## 1. Color Palette & Dark Theme System
The application utilizes a rich, custom dark-theme system. General plain colors are avoided in favor of modern HSL-inspired slate and indigo gradients:

* **Backgrounds**:
  * Main window: `bg-slate-950`
  * Gradient overlays: `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950`
* **Panels & Containers**:
  * Dashboard cards and panels: `bg-slate-900/80` with backdrop blur (`backdrop-blur-md`).
  * Table rows and items: `bg-slate-950/70` with border lines `border-slate-800`.
* **Primary Accents & Buttons**:
  * Brand indigo highlights: `bg-indigo-600` and `hover:bg-indigo-500` with subtle box-shadows `shadow-lg shadow-indigo-600/20`.
  * Secondary indicators (e.g. MCQ choices): `bg-slate-950` with hover outline states `hover:border-indigo-500/50`.
* **Semantic States**:
  * Success / Active states: Green (`emerald-500` text, `emerald-950/30` background).
  * Warnings / Telemetry alerts: Red/Rose (`rose-500` text, `rose-950/30` background).

---

## 2. Shared Layout & Typography
* **Sidebar Navigation**: The application uses a unified sidebar layout (`Sidebar.tsx`) positioned on the left side of the screen for desktop viewports. It provides workspace routes based on the current authenticated user's role.
* **Typography**: Falls back to modern system sans-serif font families (Inter/system-ui) with varying font weights:
  * Headers: Semi-bold (`font-semibold`) and bold (`font-bold`) text with tracking overrides (`tracking-tight`).
  * Codes / Course labels: Monospace text (`font-mono`) to highlight technical indicators.

---

## 3. Real-Time Indicators & Cues

### A. Quiz Autosave Status
* **Location**: Top-right corner of the `QuizRunner.tsx` screen.
* **Visual States**:
  * *Saving...*: Displayed in yellow/amber text with a spinning loader when active database writes are happening.
  * *All answers saved*: Displayed in green text with a check icon to indicate all responses are written.

### B. Exam Time Indicators
* **Timer Progress**: The countdown timer displays minutes and seconds (`MM:SS`).
* **Critical State**: When the remaining time drops below **5 minutes**, the timer text and borders transition to red (`text-rose-500`) combined with a pulsing animation to alert the student.

### C. Live Dashboard Status
* **Teacher Monitoring**:
  * Student cards display progress bars indicating percentage completion.
  * Tab-switching telemetry uses a color threshold: if tab switches exceed 3, the metric is highlighted in solid red to flag potential cheating.

---

## 4. Layout Warnings & Overlays

### A. Session Invalidated Overlay
* **Condition**: Fired when a double-login or tab switch is detected.
* **Visuals**: A full-screen backdrop overlay (`fixed inset-0 bg-slate-950/90 backdrop-blur-sm`) blocks out the exam interface. It displays an invalid token header, a security description, and redirects the student to the login page, locking out further keyboard or mouse input.

---

## 5. Known Design Limitations
* **Mobile Responsiveness (Unstarted)**: The layouts are configured primarily for widescreen monitors and desktop browsers (screen width >= 1024px). Sidebar navigations and table displays will wrap incorrectly or clip on screen widths under 768px (mobile phones and tablets). Audit and responsiveness optimization is planned for Phase 4.
