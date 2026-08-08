# 🎨 Quiz Nest Portal (React + Vite Frontend)

This is the decoupled client portal Single-Page Application (SPA) for Quiz Nest, providing dashboards, question banks editor, active assessment runners with telemetry event trackers, and scoreanalytics summaries.

---

## 🛠️ Technology Stack
* **Framework**: React 19 + TypeScript
* **Build Bundler**: Vite
* **Styling**: Tailwind CSS + custom HSL CSS theme design system
* **Icons**: Lucide React
* **Error Telemetry**: Sentry React SDK
* **Unit Testing**: Vitest + React Testing Library + JSDOM

---

## 🔑 Environment Configuration (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory with the following variables:

```env
# Backend API Base Path (Default: http://localhost:5000)
VITE_API_URL="http://localhost:5000"

# Error Telemetry (Sentry)
VITE_SENTRY_DSN="https://..."
```

---

## 🚀 Execution Commands

### 1. Setup Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 3. Build Static Web Assets (For Production)
Compiles React code into optimized assets in the `dist/` directory:
```bash
npm run build
```

---

## 🧪 Testing

The client portal uses **Vitest** and **React Testing Library** to verify components in a mock JSDOM browser context.

* **Execute Tests**:
  ```bash
  npm run test
  ```
