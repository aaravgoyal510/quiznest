import { useState, useEffect } from "react";
import LoginPage from "./pages/Login";
import StudentDashboard from "./pages/student/Dashboard";
import QuizRunner from "./pages/student/QuizRunner";
import TeacherDashboard from "./pages/teacher/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import ProfilePage from "./pages/Profile";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import QuizPreview from "./pages/teacher/QuizPreview";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  // Synchronize state router on back/forward browser navigations
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  // 1. Auth Gate
  if (path === "/login") {
    return <LoginPage navigate={navigate} />;
  }

  // 2. Student Quiz Runner (Dynamic URL matching: /student/quiz/[quizId]/take)
  if (path.startsWith("/student/quiz/") && path.endsWith("/take")) {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "STUDENT") {
      // Role Lock: Redirect non-students to their respective dashboards
      setTimeout(() => {
        if (user.role === "ADMIN") navigate("/admin/dashboard");
        if (user.role === "TEACHER") navigate("/teacher/dashboard");
      }, 10);
      return null;
    }

    const parts = path.split("/");
    const quizId = parts[3]; // Extracts quizId from path array
    return <QuizRunner quizId={quizId} navigate={navigate} />;
  }

  // 3. Student Dashboard
  if (path === "/student/dashboard") {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "STUDENT") {
      setTimeout(() => {
        if (user.role === "ADMIN") navigate("/admin/dashboard");
        if (user.role === "TEACHER") navigate("/teacher/dashboard");
      }, 10);
      return null;
    }

    return <StudentDashboard navigate={navigate} />;
  }

  // 4. Teacher Dashboard (with sub-routes)
  if (path === "/teacher/dashboard" || path === "/teacher/quizzes") {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "TEACHER") {
      setTimeout(() => {
        if (user.role === "ADMIN") navigate("/admin/dashboard");
        if (user.role === "STUDENT") navigate("/student/dashboard");
      }, 10);
      return null;
    }

    return <TeacherDashboard navigate={navigate} />;
  }

  // 4B. Teacher Quiz Preview (Dynamic URL matching: /teacher/quizzes/[quizId]/preview)
  if (path.startsWith("/teacher/quizzes/") && path.endsWith("/preview")) {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "TEACHER") {
      setTimeout(() => {
        if (user.role === "ADMIN") navigate("/admin/dashboard");
        if (user.role === "STUDENT") navigate("/student/dashboard");
      }, 10);
      return null;
    }

    const parts = path.split("/");
    const quizId = parts[3];
    return <QuizPreview quizId={quizId} navigate={navigate} />;
  }

  // 5. Admin Dashboard (with sub-routes)
  if (
    path === "/admin/dashboard" ||
    path === "/admin/users" ||
    path === "/admin/subjects" ||
    path === "/admin/results" ||
    path === "/admin/audit-log" ||
    path === "/admin/quizzes" ||
    path === "/admin/unlock-requests"
  ) {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "ADMIN") {
      setTimeout(() => {
        if (user.role === "TEACHER") navigate("/teacher/dashboard");
        if (user.role === "STUDENT") navigate("/student/dashboard");
      }, 10);
      return null;
    }

    const initialTab =
      path === "/admin/subjects" ? "subjects" :
      path === "/admin/audit-log" ? "audit" :
      path === "/admin/results" ? "results" :
      path === "/admin/quizzes" ? "quizzes" :
      path === "/admin/unlock-requests" ? "unlock-requests" :
      "users"; // Default to users tab

    return <AdminDashboard navigate={navigate} initialTab={initialTab as any} />;
  }

  // 6. Forgot Password Page (Public Route)
  if (path === "/forgot-password") {
    return <ForgotPasswordPage navigate={navigate} />;
  }

  // 7. Reset Password Page (Public Route)
  if (path === "/reset-password") {
    return <ResetPasswordPage navigate={navigate} />;
  }

  // 8. Profile Settings Page
  if (path === "/profile") {
    const token = localStorage.getItem("quiz_auth_token");
    if (!token) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }
    return <ProfilePage navigate={navigate} />;
  }

  // 7. Role-Based Landing Gate (Home / Root redirector)
  if (path === "/") {
    const token = localStorage.getItem("quiz_auth_token");
    const userStr = localStorage.getItem("quiz_auth_user");

    if (!token || !userStr) {
      setTimeout(() => navigate("/login"), 10);
      return null;
    }

    const user = JSON.parse(userStr);
    if (user.role === "ADMIN") {
      setTimeout(() => navigate("/admin/dashboard"), 10);
    } else if (user.role === "TEACHER") {
      setTimeout(() => navigate("/teacher/dashboard"), 10);
    } else {
      setTimeout(() => navigate("/student/dashboard"), 10);
    }
    return null;
  }

  // 8. Default 404 Fallback page
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-slate-400 mb-6">The requested path does not exist in this learning workspace.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer"
      >
        Go to Home Workspace
      </button>
    </div>
  );
}
