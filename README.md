# 🎓 Quiz Nest — Decoupled Split Architecture Portal

Quiz Nest is a full-stack, enterprise-grade Online Quiz Management System for educational institutions. The application has been fully refactored from a monolithic codebase into a highly performant **decoupled split architecture**, separating client-side UI rendering from server-side database transaction layers.

---

## 🏗️ Architecture Design & Directory Mapping

The codebase is split into two independent services:

```text
quizapp/
├── backend/          # Standalone Express API Service
└── frontend/         # React SPA client portal (Vite)
```

### 1. Standalone Backend (`backend/`)
* **Core**: Node.js + Express API server.
* **Database**: Supabase PostgreSQL database managed via **Prisma ORM**.
* **Security**: Stateless **JWT token-based auth** with token-version verification middleware.
* **Integrations**: **Resend** for password reset emails and **Sentry Node** for error telemetry tracking.

### 2. Single-Page Application Client (`frontend/`)
* **Core**: **React 19** bundled using **Vite**.
* **Styling**: Vanilla CSS custom utility system with **Tailwind CSS**.
* **Security**: Client-side auth state sync and navigation guards.
* **Integrations**: **Sentry React** for client-side crash tracking and component error boundaries.

---

## 🔌 How They Connect
1. **Client-Side Requests**: The React frontend (running on `http://localhost:3000`) communicates with the API service (running on `http://localhost:5000`) via `fetch` calls.
2. **Authentication**: Upon successful credential checks, the backend issues a signed JWT. The client stores this token in `localStorage` and appends it to subsequent queries in the request headers:
   `Authorization: Bearer <JWT_token>`
3. **CORS Security**: The backend is configured to authorize requests **only** from the origin declared in its `FRONTEND_URL` environment variable (preventing unauthorized external client requests).

---

## 🚀 Local Development Quick Start

Run both services in separate terminal sessions:

### 1. Launch Backend API Service
```bash
cd backend
# 1. Install dependencies
npm install
# 2. Synchronize Prisma model schemas
npx prisma db push
# 3. Seed demo credentials database
npx ts-node prisma/seed.ts
# 4. Start hot-reloading dev server
npm run dev
```
The API will list on **`http://localhost:5000`**.

### 2. Launch Frontend Client Portal
```bash
cd frontend
# 1. Install dependencies
npm install
# 2. Start hot-reloading dev server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 👤 Test Institutional Accounts

Use the following pre-seeded demo profiles to sign in:

| Role | Email | Password | Access Dashboard |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@institution.edu` | `Admin123!` | `/admin/dashboard` |
| **Teacher** | `teacher@institution.edu` | `Teacher123!` | `/teacher/dashboard` |
| **Student** | `student@institution.edu` | `Student123!` | `/student/dashboard` |

---

## 🛠️ Deployment Guidelines

### 1. Deploying Frontend
The frontend builds into optimized static HTML, CSS, and JS assets. It can be deployed to any static host (e.g. Vercel, Netlify, Cloudflare Pages, AWS S3):
* Run compilation: `npm run build`
* Deploy the output **`dist/`** directory.
* Set `VITE_API_URL` environment build variable pointing to your deployed backend API domain.

### 2. Deploying Backend
The backend can be deployed to any container hosting provider (e.g. Render, Railway, AWS ECS, Heroku):
* Deploy the Express code.
* Inject host environment variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`, `RESEND_API_KEY`, `SENTRY_DSN`).
