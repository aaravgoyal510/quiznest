import "./instrument";
import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { studentRouter } from "./routes/student";
import { teacherRouter } from "./routes/teacher";
import { adminRouter } from "./routes/admin";
import { profileRouter } from "./routes/profile";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

// Configure CORS for single/multiple origins and Vercel preview deploys
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*") ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Bind routes
app.use("/api/auth", authRouter);
app.use("/api/student", studentRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/admin", adminRouter);
app.use("/api/profile", profileRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Sentry error handler middleware (must register after controllers)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Fallback custom error handler to guarantee Sentry captures all exceptions
app.use((err: any, req: any, res: any, next: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  console.error("Captured unhandled error:", err);
  res.status(500).json({ error: err.message || "An unexpected error occurred." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 QuizNest Standalone Backend API listening on http://localhost:${PORT}`);
  });
}

export { app };
