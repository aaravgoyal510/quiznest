import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    beforeSend(event) {
      // Redact sensitive keys from request payloads
      if (event.request && event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      if (event.request && event.request.data) {
        try {
          const body = typeof event.request.data === "string" 
            ? JSON.parse(event.request.data) 
            : event.request.data;
            
          if (body && typeof body === "object") {
            const sensitiveKeys = ["password", "token", "newPassword", "currentPassword"];
            sensitiveKeys.forEach(key => {
              if (key in body) body[key] = "[REDACTED]";
            });
            event.request.data = JSON.stringify(body);
          }
        } catch (e) {
          event.request.data = "[REDACTED]";
        }
      }
      return event;
    }
  });
}
