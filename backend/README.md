# 🚀 Quiz Nest API Service (Express Backend)

This is the standalone REST API backend service for Quiz Nest. It processes institutional user accounts, question banks, quiz scheduling, active student attempts, telemetry tracking, and auto-grading.

---

## 🛠️ Technology Stack
* **Runtime**: Node.js + TypeScript
* **Router Framework**: Express.js
* **Database Interface**: Prisma ORM
* **Authentication**: JSON Web Tokens (`jsonwebtoken` + `bcryptjs`)
* **Email Delivery**: Resend SDK
* **Error Telemetry**: Sentry Node SDK v8 (Preloaded with OTEL hooks)
* **Automated Testing**: Jest + Supertest

---

## 🔑 Environment Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory with the following keys:

```env
# Database Settings
DATABASE_URL="postgresql://postgres.[USER]:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true&connection_limit=2"

# Server Port
PORT=5000

# Security Key
JWT_SECRET="your-jwt-auth-key-secret"

# Authorized Client Origin
FRONTEND_URL="http://localhost:3000"

# Email Integration (Resend)
RESEND_API_KEY="re_..."

# Error Telemetry (Sentry)
SENTRY_DSN="https://..."
```

---

## 🚀 Execution Commands

### 1. Setup Dependencies
```bash
npm install
```

### 2. Database Sync & Push
Applies the Prisma schema layout directly to your Supabase PostgreSQL DB:
```bash
npx prisma db push
```

### 3. Database Seeding
Seeds demo Admin, Teacher, and Student profiles:
```bash
npx ts-node prisma/seed.ts
```

### 4. Running Local Development Server
```bash
npm run dev
```
The server will run on `http://localhost:5000` with hot-reloading active.

---

## 🧪 Testing

The API uses **Jest** and **Supertest** to test critical routes in-memory.

* **Database isolation**: Tests execute sequentially using `--runInBand` and clean up all generated records in teardown hooks (deleting records starting with `test-api-` prefixes).
* **Execute Tests**:
  ```bash
  npm run test
  ```
