import { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { Clock, AlertCircle, Plus, Trash2, Play, BarChart2, CheckCircle, RefreshCw, Upload, Edit, Eye, Hourglass, Unlock } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { TeacherGradingPanel } from "../../components/teacher/GradingPanel";
import { UnlockRequestModal } from "../../components/teacher/UnlockRequestModal";

interface DashboardProps {
  navigate: (to: string) => void;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  options: QuestionOption[];
}

interface Quiz {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  adminUnlockedForEditing: boolean;
  subject: { name: string; code: string };
  questions?: Question[];
  _count: { attempts: number; questions: number };
}

interface ResultAttempt {
  id: string;
  student: { name: string; email: string; department: string | null };
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  defocusCount: number;
  defocusDurationSeconds: number;
  timeSpentSeconds: number | null;
}

interface LiveAttempt {
  id: string;
  studentName: string;
  studentEmail: string;
  startedAt: string;
  submittedAt: string | null;
  answersCount: number;
  totalQuestions: number;
  timeLeftSeconds: number;
  defocusCount: number;
  defocusDurationSeconds: number;
}

export default function TeacherDashboard({ navigate }: DashboardProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<{ name: string; email: string; role: "TEACHER" } | null>(null);

  // Modal / Overlay States
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [activeQuizResults, setActiveQuizResults] = useState<{ quiz: Quiz; attempts: ResultAttempt[] } | null>(null);
  const [activeLiveQuiz, setActiveLiveQuiz] = useState<{ quizId: string; title: string; attempts: LiveAttempt[] } | null>(null);
  // Grading panel state
  const [gradingQuiz, setGradingQuiz] = useState<{ id: string; title: string } | null>(null);
  // Unlock request modal state
  const [unlockRequestQuiz, setUnlockRequestQuiz] = useState<{ id: string; title: string } | null>(null);

  // Quiz Editor Form States
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizDuration, setQuizDuration] = useState("30");
  const [quizSubject, setQuizSubject] = useState("");
  const [quizStart, setQuizStart] = useState("");
  const [quizEnd, setQuizEnd] = useState("");

  // Scoped Quiz Questions List State
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  // Question Builder Form States
  const [showQForm, setShowQForm] = useState(false);
  const [editingQIndex, setEditingQIndex] = useState<number | null>(null); // Index in local state
  const [editingQId, setEditingQId] = useState<string | null>(null); // DB Question ID
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("MCQ");
  const [qPoints, setQPoints] = useState("1");
  const [qOptions, setQOptions] = useState<QuestionOption[]>([
    { text: "Choice A", isCorrect: true },
    { text: "Choice B", isCorrect: false },
  ]);

  // Bulk Import Form States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("quiz_auth_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    loadInitialData();

    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const qRes = await apiFetch("/api/teacher/quizzes");
      const qData = await qRes.json();
      if (qRes.ok) setQuizzes(qData.quizzes || []);

      const subRes = await apiFetch("/api/teacher/subjects");
      const subData = await subRes.json();
      if (subRes.ok) {
        setSubjects(subData.subjects || []);
        if (subData.subjects && subData.subjects.length > 0) {
          setQuizSubject(subData.subjects[0].id);
        }
      }
    } catch (err) {
      setError("Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  }

  // --- Scoped Quiz Actions ---
  const handleOpenNewQuiz = () => {
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizDesc("");
    setQuizDuration("30");
    if (subjects.length > 0) setQuizSubject(subjects[0].id);
    setQuizStart("");
    setQuizEnd("");
    setQuizQuestions([]);
    setShowQuizModal(true);
    setShowQForm(false);
  };

  const handleOpenEditQuiz = async (quiz: Quiz) => {
    try {
      setError("");
      setSuccess("");
      setEditingQuizId(quiz.id);
      setQuizTitle(quiz.title);
      setQuizDesc(quiz.description || "");
      setQuizDuration(String(quiz.durationMinutes));
      setQuizSubject(quiz.subjectId || "");
      // Convert start/end ISO strings to local datetime strings
      const startLocal = quiz.startsAt ? new Date(quiz.startsAt).toISOString().slice(0, 16) : "";
      const endLocal = quiz.endsAt ? new Date(quiz.endsAt).toISOString().slice(0, 16) : "";
      setQuizStart(startLocal);
      setQuizEnd(endLocal);

      // Fetch latest questions list
      const res = await apiFetch(`/api/teacher/quizzes/${quiz.id}/preview`);
      const data = await res.json();
      if (res.ok) {
        setQuizQuestions(data.quiz.questions || []);
      } else {
        setQuizQuestions([]);
      }

      setShowQuizModal(true);
      setShowQForm(false);
    } catch (err) {
      setError("Failed to load quiz details.");
    }
  };

  // --- Quiz Save Handler ---
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (quizQuestions.length === 0) {
      setError("Please add at least one question to the assessment.");
      return;
    }

    try {
      if (editingQuizId) {
        // Quiz level properties update
        const res = await apiFetch(`/api/teacher/quizzes/${editingQuizId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: quizTitle,
            description: quizDesc,
            durationMinutes: Number(quizDuration),
            startsAt: quizStart,
            endsAt: quizEnd,
            subjectId: quizSubject,
          }),
        });

        if (res.ok) {
          setSuccess("Quiz properties saved successfully!");
          setShowQuizModal(false);
          loadInitialData();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to update quiz properties.");
        }
      } else {
        // Create Quiz Flow
        const res = await apiFetch("/api/teacher/quizzes", {
          method: "POST",
          body: JSON.stringify({
            title: quizTitle,
            description: quizDesc,
            durationMinutes: Number(quizDuration),
            startsAt: quizStart,
            endsAt: quizEnd,
            subjectId: quizSubject,
            questions: quizQuestions, // Nested create layout
          }),
        });

        if (res.ok) {
          setSuccess("Quiz created successfully!");
          setShowQuizModal(false);
          loadInitialData();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to create quiz.");
        }
      }
    } catch (err) {
      setError("Error saving quiz. Please retry.");
    }
  };

  const handleTogglePublish = async (quizId: string, currentPublished: boolean) => {
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}`, {
        method: "PUT",
        body: JSON.stringify({ isPublished: !currentPublished }),
      });
      if (res.ok) {
        loadInitialData();
      }
    } catch (err) {
      setError("Failed to toggle publish state.");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? All student score attempt records will be deleted.")) return;
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}`, { method: "DELETE" });
      if (res.ok) {
        loadInitialData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete quiz.");
      }
    } catch (err) {
      setError("Failed to delete quiz.");
    }
  };

  // --- Inline Question Editor CRUD ---
  const handleOpenQFormNew = () => {
    setEditingQIndex(null);
    setEditingQId(null);
    setQText("");
    setQType("MCQ");
    setQPoints("1");
    setQOptions([
      { text: "Choice A", isCorrect: true },
      { text: "Choice B", isCorrect: false },
    ]);
    setShowQForm(true);
  };

  const handleOpenQFormEdit = (q: any, idx: number) => {
    setEditingQIndex(idx);
    setEditingQId(q.id || null);
    setQText(q.text);
    setQType(q.type);
    setQPoints(String(q.points));
    setQOptions(q.options || []);
    setShowQForm(true);
  };

  const handleSaveInlineQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;

    const parsedQuestionPayload = {
      text: qText,
      type: qType,
      points: Number(qPoints),
      options: qType === "SHORT_ANSWER" ? qOptions.map(o => ({ ...o, isCorrect: true })) : qOptions,
    };

    if (editingQuizId) {
      // Editing quiz flow -> write directly to the DB child API
      try {
        setError("");
        let res;
        if (editingQId) {
          // PUT
          res = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/questions/${editingQId}`, {
            method: "PUT",
            body: JSON.stringify(parsedQuestionPayload),
          });
        } else {
          // POST
          res = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/questions`, {
            method: "POST",
            body: JSON.stringify(parsedQuestionPayload),
          });
        }

        const data = await res.json();
        if (res.ok) {
          // Reload latest questions
          const qres = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/preview`);
          const qdata = await qres.json();
          if (qres.ok) setQuizQuestions(qdata.quiz.questions || []);
          setShowQForm(false);
        } else {
          setError(data.error || "Question update blocked.");
        }
      } catch (err) {
        setError("Network error updating question.");
      }
    } else {
      // Creation flow -> save to local array state
      if (editingQIndex !== null) {
        const updated = [...quizQuestions];
        updated[editingQIndex] = parsedQuestionPayload;
        setQuizQuestions(updated);
      } else {
        setQuizQuestions([...quizQuestions, parsedQuestionPayload]);
      }
      setShowQForm(false);
    }
  };

  const handleDeleteInlineQuestion = async (idx: number, qId?: string) => {
    if (editingQuizId && qId) {
      // Edit quiz mode -> delete from DB child API
      if (!confirm("Are you sure you want to delete this question?")) return;
      try {
        setError("");
        const res = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/questions/${qId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const qres = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/preview`);
          const qdata = await qres.json();
          if (qres.ok) setQuizQuestions(qdata.quiz.questions || []);
        } else {
          const data = await res.json();
          setError(data.error || "Failed to delete question.");
        }
      } catch (err) {
        setError("Error deleting question.");
      }
    } else {
      // Creation mode -> delete local state
      const updated = [...quizQuestions];
      updated.splice(idx, 1);
      setQuizQuestions(updated);
    }
  };

  // Option Builder helpers
  const handleAddOption = () => {
    setQOptions([...qOptions, { text: `Choice ${String.fromCharCode(65 + qOptions.length)}`, isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    const updated = [...qOptions];
    updated.splice(index, 1);
    setQOptions(updated);
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...qOptions];
    updated[index].text = text;
    setQOptions(updated);
  };

  const handleOptionCorrectChange = (index: number, val: boolean) => {
    const updated = [...qOptions];
    if (qType === "TRUE_FALSE") {
      // Only one can be correct
      updated.forEach((o, i) => {
        o.isCorrect = i === index ? val : false;
      });
    } else {
      updated[index].isCorrect = val;
    }
    setQOptions(updated);
  };

  // --- CSV Bulk Import parser inside Quiz ---
  function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          cell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") i++;
        row.push(cell.trim());
        if (row.some(c => c !== "")) result.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell !== "" || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c !== "")) result.push(row);
    }
    return result;
  }

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Text,Type,Points,Options,CorrectOptions\n" +
      "\"Sample MCQ: What is 2 + 2?\",MCQ,2,3;;4;;5,4\n" +
      "Sample True/False: The sun rises in the east.,TRUE_FALSE,1,,True\n" +
      "Sample Short Answer: Capital city of Japan,SHORT_ANSWER,3,,Tokyo";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "quiznest_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSVTrigger = () => {
    setImportFile(null);
    setImportErrors([]);
    setShowImportModal(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportErrors([]);
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      if (editingQuizId) {
        // Upload directly to existing quiz DB scope
        try {
          const res = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/questions/import`, {
            method: "POST",
            body: JSON.stringify({ csvText: text }),
          });
          const data = await res.json();
          if (res.ok) {
            // Reload latest questions
            const qres = await apiFetch(`/api/teacher/quizzes/${editingQuizId}/preview`);
            const qdata = await qres.json();
            if (qres.ok) setQuizQuestions(qdata.quiz.questions || []);
            setShowImportModal(false);
          } else {
            setImportErrors(data.errors || [data.error || "Failed to import questions."]);
          }
        } catch (err) {
          setImportErrors(["Network error importing questions."]);
        }
      } else {
        // Parse CSV on client and load questions into local array
        const rows = parseCSV(text);
        if (rows.length < 2) {
          setImportErrors(["CSV file is empty or missing data rows."]);
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase());
        const textIdx = headers.indexOf("text");
        const typeIdx = headers.indexOf("type");
        const pointsIdx = headers.indexOf("points");
        const optionsIdx = headers.indexOf("options");
        const correctOptionsIdx = headers.indexOf("correctoptions");

        if (textIdx === -1 || typeIdx === -1 || pointsIdx === -1 || correctOptionsIdx === -1) {
          setImportErrors(["Missing CSV headers: Text, Type, Points, CorrectOptions."]);
          return;
        }

        const newLocalQuestions: any[] = [];
        const errorsList: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || row.every(c => c === "")) continue;

          const qTextStr = row[textIdx];
          const qTypeStr = row[typeIdx]?.toUpperCase();
          const qPointsStr = row[pointsIdx];
          const qOptionsStr = row[optionsIdx] || "";
          const qCorrectStr = row[correctOptionsIdx] || "";
          const rowNum = i + 1;

          if (!qTextStr) {
            errorsList.push(`Row ${rowNum}: Question text is required.`);
            continue;
          }
          if (!["MCQ", "TRUE_FALSE", "SHORT_ANSWER"].includes(qTypeStr)) {
            errorsList.push(`Row ${rowNum}: Invalid type.`);
            continue;
          }
          const pts = Number(qPointsStr);
          if (isNaN(pts) || pts <= 0) {
            errorsList.push(`Row ${rowNum}: Points must be a positive integer.`);
            continue;
          }

          if (qTypeStr === "MCQ") {
            const opts = qOptionsStr.split(";;").map(o => o.trim()).filter(o => o !== "");
            const corrects = qCorrectStr.split(";;").map(c => c.trim()).filter(c => c !== "");
            if (opts.length < 2) {
              errorsList.push(`Row ${rowNum}: MCQ must have at least 2 options.`);
              continue;
            }
            newLocalQuestions.push({
              text: qTextStr,
              type: qTypeStr,
              points: pts,
              options: opts.map(opt => ({ text: opt, isCorrect: corrects.includes(opt) })),
            });
          } else if (qTypeStr === "TRUE_FALSE") {
            const isTrue = qCorrectStr.trim().toLowerCase() === "true";
            newLocalQuestions.push({
              text: qTextStr,
              type: qTypeStr,
              points: pts,
              options: [
                { text: "True", isCorrect: isTrue },
                { text: "False", isCorrect: !isTrue },
              ],
            });
          } else if (qTypeStr === "SHORT_ANSWER") {
            const corrects = qCorrectStr.split(";;").map(c => c.trim()).filter(c => c !== "");
            newLocalQuestions.push({
              text: qTextStr,
              type: qTypeStr,
              points: pts,
              options: corrects.map(c => ({ text: c, isCorrect: true })),
            });
          }
        }

        if (errorsList.length > 0) {
          setImportErrors(errorsList);
        } else {
          setQuizQuestions([...quizQuestions, ...newLocalQuestions]);
          setShowImportModal(false);
        }
      }
    };
    reader.readAsText(importFile);
  };

  // --- Results / Score Reports ---
  const handleOpenResults = async (quiz: Quiz) => {
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quiz.id}/results`);
      const data = await res.json();
      if (res.ok) {
        setActiveQuizResults({ quiz, attempts: data.attempts || [] });
      }
    } catch (err) {
      alert("Failed to load score reports.");
    }
  };

  const handleExportCSV = async (quizId: string) => {
    try {
      const res = await apiFetch("/api/teacher/results/export", {
        method: "POST",
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (res.ok && data.records) {
        // Construct raw CSV contents
        const headers = ["Quiz Title", "Subject", "Student Name", "Student Email", "Department", "Year", "Started At", "Submitted At", "Score", "Focus Switch Count", "Focus Switch Duration (sec)"];
        const rows = (data.records as any[]).map((r) => [
          `"${r.quizTitle}"`,
          r.subject,
          `"${r.studentName}"`,
          r.studentEmail,
          r.department,
          r.year,
          r.startedAt,
          r.submittedAt,
          r.score,
          r.defocusCount,
          r.defocusDurationSeconds,
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `quiznest_results_${quizId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("Failed to export score reports.");
    }
  };

  // --- Live Assessment Monitoring (Interval polling) ---
  const handleOpenLiveMonitor = (quizId: string, title: string) => {
    setActiveLiveQuiz({ quizId, title, attempts: [] });
    syncLiveProgress(quizId);
    liveIntervalRef.current = setInterval(() => {
      syncLiveProgress(quizId);
    }, 2000);
  };

  const syncLiveProgress = async (quizId: string) => {
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}/progress`);
      const data = await res.json();
      if (res.ok) {
        setActiveLiveQuiz((prev) => {
          if (!prev) return null;
          return { ...prev, attempts: data.activeAttempts || [] };
        });
      }
    } catch (err) {
      console.error("Live progress tracking sync error:", err);
    }
  };

  const handleCloseLiveMonitor = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    setActiveLiveQuiz(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading dashboard workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans animate-fade-in">
      {user && <Sidebar role="TEACHER" user={user} navigate={navigate} />}

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Teacher Console</h1>
            <p className="text-slate-400 text-sm mt-1">Design assessments and monitor classroom progress</p>
          </div>
          <div>
            <button
              onClick={handleOpenNewQuiz}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center space-x-2 text-sm cursor-pointer transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Assessment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl text-emerald-300 text-sm flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Quizzes List rendering */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
            <span>Scheduled Assessments</span>
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{quizzes.length}</span>
          </h2>

          {quizzes.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-850 p-12 rounded-2xl text-center text-slate-500">
              No assessments scheduled. Click "New Assessment" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:border-slate-700 transition-colors duration-200 shadow-lg">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900">
                        {quiz.subject.code}
                      </span>
                      <span className="text-xs text-slate-450 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{quiz.durationMinutes} Mins</span>
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        quiz.isPublished
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                          : "bg-slate-950 text-slate-500 border-slate-850"
                      }`}>
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                      {quiz.adminUnlockedForEditing && (
                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse">
                          Admin Unlocked
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">{quiz.title}</h3>
                    {quiz.description && <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">{quiz.description}</p>}
                    <p className="text-[10px] text-slate-500 font-mono">
                      Window: {new Date(quiz.startsAt).toLocaleString()} - {new Date(quiz.endsAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
                    <button
                      onClick={() => handleTogglePublish(quiz.id, quiz.isPublished)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        quiz.isPublished
                          ? "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                          : "bg-indigo-950/40 border-indigo-800 text-indigo-450 hover:bg-indigo-950"
                      }`}
                    >
                      {quiz.isPublished ? "Revoke" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleOpenLiveMonitor(quiz.id, quiz.title)}
                      className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Monitor</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditQuiz(quiz)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/quizzes/${quiz.id}/preview`)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-850 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => handleOpenResults(quiz)}
                      className="px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Scores</span>
                    </button>
                    {/* Grading panel button — shown when quiz has submitted attempts */}
                    {quiz._count.attempts > 0 && (
                      <button
                        onClick={() => setGradingQuiz({ id: quiz.id, title: quiz.title })}
                        className="px-3 py-1.5 bg-amber-950/40 hover:bg-amber-950 text-amber-400 border border-amber-800/40 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                        title="Review pending manually-graded answers"
                      >
                        <Hourglass className="w-3.5 h-3.5" />
                        <span>Grade</span>
                      </button>
                    )}
                    {/* Unlock request button — shown when quiz is locked due to submitted attempts */}
                    {quiz._count.attempts > 0 && !quiz.adminUnlockedForEditing && (
                      <button
                        onClick={() => setUnlockRequestQuiz({ id: quiz.id, title: quiz.title })}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                        title="Request admin to unlock this quiz for editing"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-450 rounded-lg border border-transparent hover:border-rose-900/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- MODAL: CREATE OR EDIT ASSESSMENT --- */}

        {/* --- GRADING PANEL MODAL --- */}
        {gradingQuiz && (
          <TeacherGradingPanel
            quizId={gradingQuiz.id}
            onClose={() => setGradingQuiz(null)}
            onAllFinalized={() => {
              setGradingQuiz(null);
              setSuccess("All attempts finalized!");
              loadInitialData();
            }}
          />
        )}

        {/* --- UNLOCK REQUEST MODAL --- */}
        {unlockRequestQuiz && (
          <UnlockRequestModal
            quizId={unlockRequestQuiz.id}
            quizTitle={unlockRequestQuiz.title}
            onClose={() => setUnlockRequestQuiz(null)}
            onSuccess={() => {
              setSuccess("Unlock request submitted. Pending admin approval.");
              loadInitialData();
            }}
          />
        )}

        {showQuizModal && (

          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-850 w-full max-w-3xl rounded-2xl p-6 text-slate-100 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold tracking-tight border-b border-slate-800 pb-3">
                {editingQuizId ? "Edit Assessment Workspace" : "Create Scheduled Assessment"}
              </h2>

              <form onSubmit={handleSaveQuiz} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subject Course</label>
                    <select
                      value={quizSubject} onChange={(e) => setQuizSubject(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assessment Title</label>
                    <input
                      type="text" required value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="E.g. Unit 3 Programming Midterm"
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={2} value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)}
                    placeholder="Provide description/instructions for students..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
                    <input
                      type="number" required value={quizDuration} onChange={(e) => setQuizDuration(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Starts At</label>
                    <input
                      type="datetime-local" required value={quizStart} onChange={(e) => setQuizStart(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ends At</label>
                    <input
                      type="datetime-local" required value={quizEnd} onChange={(e) => setQuizEnd(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                    />
                  </div>
                </div>

                {/* Inline Question Bank builder */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Assessment Questions</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5">Manage questions directly inside this assessment context</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button" onClick={handleImportCSVTrigger}
                        className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer text-slate-300"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Import CSV</span>
                      </button>
                      <button
                        type="button" onClick={handleOpenQFormNew}
                        className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-850 text-indigo-400 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline list */}
                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
                    {quizQuestions.length === 0 ? (
                      <p className="text-slate-500 text-xs py-4 text-center">No questions added yet. Use "+ Add Question" or "Import CSV" to start.</p>
                    ) : (
                      quizQuestions.map((q, idx) => (
                        <div key={q.id || idx} className="flex justify-between items-start p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs hover:border-slate-750 transition-colors">
                          <div className="space-y-1.5 pr-4 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-slate-950 text-indigo-450 border border-slate-800 rounded">
                                {idx + 1}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{q.type}</span>
                              <span className="text-[9px] font-bold text-amber-505 bg-amber-950/20 px-1 rounded">{q.points} Pts</span>
                            </div>
                            <p className="font-semibold text-slate-200">{q.text}</p>
                          </div>
                          <div className="flex space-x-1 shrink-0">
                            <button
                              type="button" onClick={() => handleOpenQFormEdit(q, idx)}
                              className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button" onClick={() => handleDeleteInlineQuestion(idx, q.id)}
                              className="p-1 hover:bg-rose-950/40 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Question builder inline form card */}
                {showQForm && (
                  <div className="bg-slate-950 border border-indigo-900/40 p-4 rounded-xl space-y-4 animate-in slide-in-from-top duration-200">
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {editingQIndex !== null ? "Edit Question Builder" : "New Question Builder"}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Question Text</label>
                        <input
                          type="text" required value={qText} onChange={(e) => setQText(e.target.value)}
                          placeholder="Type your question prompt..."
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Points</label>
                        <input
                          type="number" required value={qPoints} onChange={(e) => setQPoints(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Question Type</label>
                        <select
                          value={qType} onChange={(e) => {
                            const type = e.target.value;
                            setQType(type);
                            if (type === "TRUE_FALSE") {
                              setQOptions([
                                { text: "True", isCorrect: true },
                                { text: "False", isCorrect: false },
                              ]);
                            } else if (type === "MCQ") {
                              setQOptions([
                                { text: "Choice A", isCorrect: true },
                                { text: "Choice B", isCorrect: false },
                              ]);
                            } else {
                              setQOptions([{ text: "Accepted Answer", isCorrect: true }]);
                            }
                          }}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="MCQ">Multiple Choice (MCQ)</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                        </select>
                      </div>

                      {/* Options builder section */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {qType === "SHORT_ANSWER" ? "Accepted Answer Options" : "Answer Choices (Check correct options)"}
                          </label>
                          {qType === "MCQ" && (
                            <button
                              type="button" onClick={handleAddOption}
                              className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                            >
                              + Add Choice
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {qOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center space-x-2">
                              {qType !== "SHORT_ANSWER" && (
                                <input
                                  type="checkbox" checked={opt.isCorrect}
                                  onChange={(e) => handleOptionCorrectChange(oIdx, e.target.checked)}
                                  className="accent-indigo-500"
                                />
                              )}
                              <input
                                type="text" required value={opt.text}
                                onChange={(e) => handleOptionTextChange(oIdx, e.target.value)}
                                placeholder={qType === "SHORT_ANSWER" ? "Type accepted text..." : `Choice text value...`}
                                className="flex-1 p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none text-slate-200"
                              />
                              {qType === "MCQ" && qOptions.length > 2 && (
                                <button
                                  type="button" onClick={() => handleRemoveOption(oIdx)}
                                  className="text-rose-500 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 border-t border-slate-850 pt-3">
                      <button
                        type="button" onClick={() => setShowQForm(false)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button" onClick={handleSaveInlineQuestion}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Save Question
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button" onClick={() => setShowQuizModal(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    {editingQuizId ? "Save Assessment Parameters" : "Create Assessment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL: SCORE REPORTS / RESULTS --- */}
        {activeQuizResults && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{activeQuizResults.quiz.title}</h2>
                  <p className="text-xs text-slate-450 mt-1 font-mono uppercase">Results & Grade Book</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExportCSV(activeQuizResults.quiz.id)}
                    className="px-3.5 py-1.5 bg-emerald-950 text-emerald-450 border border-emerald-900 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => setActiveQuizResults(null)}
                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {activeQuizResults.attempts.length === 0 ? (
                  <p className="text-slate-500 text-sm py-12 text-center">No student attempt finalization records found.</p>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4 text-center">Focus Switches</th>
                        <th className="py-3 px-4 text-center">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs">
                      {activeQuizResults.attempts.map((att) => {
                        const scoreDisplay = att.score !== null ? `${att.score} Pts` : "Unmarked";
                        return (
                          <tr key={att.id} className="hover:bg-slate-950/40">
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-200 block">{att.student.name}</span>
                              <span className="text-[10px] text-slate-500 block">{att.student.email}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">
                              {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "Not Completed"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">
                              {att.timeSpentSeconds !== null ? `${Math.floor(att.timeSpentSeconds / 60)}m ${att.timeSpentSeconds % 60}s` : "N/A"}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={att.defocusCount > 3 ? "text-rose-455 font-bold" : "text-slate-400"}>
                                {att.defocusCount} switches ({att.defocusDurationSeconds}s)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-100 font-mono">
                              {scoreDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL: LIVE WORKSPACE TRACKER --- */}
        {activeLiveQuiz && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h2 className="text-xl font-bold tracking-tight">Live Tracker: {activeLiveQuiz.title}</h2>
                  </div>
                  <p className="text-xs text-slate-450 mt-0.5">Telemetry feeds updates automatically every 2s</p>
                </div>
                <button
                  onClick={handleCloseLiveMonitor}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close Monitor
                </button>
              </div>

              {activeLiveQuiz.attempts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-700" />
                  <p className="text-sm">Waiting for student submissions or defocus signals...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
                  {activeLiveQuiz.attempts.map((att) => {
                    const progressPercent = att.totalQuestions > 0 ? (att.answersCount / att.totalQuestions) * 100 : 0;
                    const isDefocusSuspicious = att.defocusCount > 4;
                    return (
                      <div key={att.id} className={`p-4 bg-slate-950/60 rounded-2xl border flex flex-col justify-between space-y-4 shadow ${
                        isDefocusSuspicious ? "border-rose-900/30 shadow-rose-900/5 bg-rose-955/5" : "border-slate-850"
                      }`}>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-200">{att.studentName}</h4>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{att.studentEmail}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block mt-1 ${
                            att.submittedAt ? "bg-emerald-950 text-emerald-450 border border-emerald-900" : "bg-indigo-950 text-indigo-400 border border-indigo-900"
                          }`}>
                            {att.submittedAt ? "Submitted" : "Taking Test"}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-450 font-semibold font-mono">
                            <span>Questions answered:</span>
                            <span>{Math.round(progressPercent)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>

                        <div className="text-[10px] space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Timer remaining:</span>
                            <span className={att.timeLeftSeconds < 300 && !att.submittedAt ? "text-rose-450 font-bold" : "text-slate-350"}>
                              {att.submittedAt ? "00:00" : `${Math.floor(att.timeLeftSeconds / 60)}m ${att.timeLeftSeconds % 60}s`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tab defocus logs:</span>
                            <span className={isDefocusSuspicious ? "text-rose-450 font-extrabold" : "text-slate-400"}>
                              {att.defocusCount} switches ({att.defocusDurationSeconds}s)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- OVERLAY: BULK IMPORT QUESTIONS --- */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 text-slate-100 shadow-2xl animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Bulk Import Questions</h2>
                <button
                  type="button" onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-455 border border-indigo-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  ↓ Download Template
                </button>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">Target Destination</label>
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 font-semibold font-mono">
                    Target Quiz: <span className="text-indigo-400">"{quizTitle || "New Quiz"}"</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">CSV Data File</label>
                  <input
                    type="file" accept=".csv" required
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">CSV Formatting Rules:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Required headers: <code className="text-indigo-400 font-mono">Text,Type,Points,CorrectOptions</code></li>
                    <li>MCQ questions require <code className="text-indigo-400 font-mono">Options</code> separated by <code className="text-indigo-400 font-mono">;;</code> (e.g. <code className="text-indigo-450 font-mono">Paris;;Rome;;Berlin</code>) and matching choice in <code className="text-indigo-450 font-mono">CorrectOptions</code>.</li>
                    <li>True/False correct option must be either <code className="text-indigo-450 font-mono">True</code> or <code className="text-indigo-455 font-mono">False</code>.</li>
                    <li>Short answer correct options can list multiple accepted options separated by <code className="text-indigo-455 font-mono">;;</code>.</li>
                  </ul>
                </div>

                {importErrors.length > 0 && (
                  <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs space-y-1 max-h-40 overflow-y-auto">
                    <p className="font-bold">Errors found during pre-import validation:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-2 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportErrors([]);
                    }}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Validate & Import
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
