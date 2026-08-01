# 🎓 Online Quiz Management System

A full-stack, enterprise-grade Online Quiz Management System for educational institutions built with **Next.js 14+ (App Router)**, **TypeScript**, **Supabase PostgreSQL**, **Prisma ORM**, **Auth.js (NextAuth v5)**, **Zod**, and **Tailwind CSS**.

---

## 🌟 Key Features

- **🔐 Multi-Role Access Control (RBAC):**
  - **ADMIN**: User management (Teachers & Students CRUD), Subject management, System activity audit logs.
  - **TEACHER**: Question Bank authoring (MCQ, True/False, Short Answer), Quiz creation with custom availability windows (`startsAt`/`endsAt`) and duration limits, Student score analytics, Manual short-answer grading, CSV export.
  - **STUDENT**: View available assessments, take active quizzes with real-time countdown timer, immediate auto-grading for objective questions, past score reports.
- **🛡️ High Security & Anti-Cheat Guards:**
  - **Server-Enforced Time Limits**: Submissions and answer updates strictly check `now <= startedAt + durationMinutes` on the server.
  - **Data Leak Prevention**: Active quiz questions strip `isCorrect` flags and answer keys before sending to student browsers.
  - **Database Injection Safeguards**: 100% parameterized queries via Prisma ORM.
  - **Form Validation**: Server-side Zod validation on all actions & routes.
  - **Password Protection**: Passwords hashed using `bcrypt` (10 rounds).

---

## 🛠️ Tech Stack & Environment

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: PostgreSQL (Supabase Connection Pooler)
- **ORM**: Prisma ORM v5
- **Authentication**: Auth.js (NextAuth v5) Credentials Provider with JWT Sessions
- **Validation**: Zod
- **Styling & UI**: Tailwind CSS & Lucide Icons

---

## 🔑 Environment Variables (`.env`)

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
AUTH_SECRET="your-super-secret-nextauth-key"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 🚀 Setup & Execution Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Schema Push
To sync your Prisma schema with the Supabase PostgreSQL database:
```bash
npx prisma db push
```

### 3. Seed Initial Demo Accounts & Data
Populate demo Admin, Teacher, and Student accounts along with subjects, question bank items, and an active assessment:
```bash
npx ts-node prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👤 Demo Institutional Accounts

| Role | Email | Password | Access Path |
|---|---|---|---|
| **Admin** | `admin@institution.edu` | `Admin123!` | `/admin/dashboard` |
| **Teacher** | `teacher@institution.edu` | `Teacher123!` | `/teacher/dashboard` |
| **Student** | `student@institution.edu` | `Student123!` | `/student/dashboard` |
