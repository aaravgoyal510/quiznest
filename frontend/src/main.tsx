import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import * as Sentry from "@sentry/react";

const VITE_SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Scrub sensitive authentication credentials from outgoing error telemetry payloads
      if (event.request && event.request.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["authorization"];
      }
      return event;
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <h1 className="text-3xl font-bold mb-4 text-rose-500">Something went wrong</h1>
        <p className="text-slate-400 mb-6">A critical client-side rendering error was captured by Sentry.</p>
        <button
          onClick={() => window.location.href = "/"}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer"
        >
          Restart Application
        </button>
      </div>
    }>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
