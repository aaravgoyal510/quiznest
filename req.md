# Requirements: Real Email Delivery & Sentry Error Monitoring

All environment credentials for local development have been successfully configured and verified.

---

## Verified Configuration
The following variables are active in your configuration files:
* **[backend/.env](file:///c:/Users/admin/Desktop/web_dev/quizapp/backend/.env)**:
  * `RESEND_API_KEY` (Verified)
  * `FRONTEND_URL` (Verified CORS settings)
  * `SENTRY_DSN` (Verified)
* **[frontend/.env.local](file:///c:/Users/admin/Desktop/web_dev/quizapp/frontend/.env.local)**:
  * `VITE_SENTRY_DSN` (Verified)

---

## Future Setup Checklist (For Production Deployments)
When deploying this decoupled application to production runtimes, ensure these variables are configured:

### 1. Resend (Email Delivery)
* **API Key**: Create a key in your Resend account dashboard.
* **Domain Verification**: To email real student domains (bypassing sandbox locks), add your custom domain in the **Domains** tab of the Resend dashboard and verify the SPF and DKIM DNS records at your domain host.
* **Code config**: Change the sender address from `onboarding@resend.dev` to your custom verified domain sender (e.g. `no-reply@yourdomain.com`).

### 2. Sentry (Error Telemetry)
* Create separate **Node/Express** and **React** projects in Sentry.
* Inject `SENTRY_DSN` to your backend host env and `VITE_SENTRY_DSN` to your frontend build config.
