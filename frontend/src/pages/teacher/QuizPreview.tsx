import { useState, useEffect } from "react";
import { Clock, AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface QuizPreviewProps {
  quizId: string;
  navigate: (to: string) => void;
}

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  options: QuestionOption[];
}

export default function QuizPreview({ quizId, navigate }: QuizPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await apiFetch(`/api/teacher/quizzes/${quizId}/preview`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load quiz details for preview.");
          setLoading(false);
          return;
        }

        const { quiz } = data;
        setQuizTitle(quiz.title);
        setQuizDesc(quiz.description || "");
        setSubjectCode(quiz.subject.code);
        setDurationMinutes(quiz.durationMinutes);

        // Map questions format
        const quizQuestions = quiz.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          options: q.options || [],
        }));
        setQuestions(quizQuestions);
      } catch (err) {
        setError("Error connecting to server. Failed to initialize preview workspace.");
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [quizId]);

  const handleSelectOption = (qId: string, optId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optId,
    }));
  };

  const handleTextAnswerChange = (qId: string, val: string) => {
    setTextAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }));
  };

  const handleSubmitPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("Preview simulated successfully! No attempt records or answers were saved to the database.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading quiz preview workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-200 mb-2">Failed to open preview</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <button
          onClick={() => navigate("/teacher/dashboard")}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12">
      {/* Top Banner & Header */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <button
            onClick={() => navigate("/teacher/dashboard")}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Teacher Dashboard</span>
          </button>

          <div className="flex items-center space-x-2 bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Teacher Preview Mode (Read-only)</span>
          </div>
        </div>

        {/* Quiz Info Header Cards */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900 font-mono">
                {subjectCode}
              </span>
              <span className="text-slate-450 text-xs font-semibold">Subject Assessment</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">{quizTitle}</h1>
            {quizDesc && <p className="text-sm text-slate-400 max-w-xl">{quizDesc}</p>}
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 border border-slate-850 p-4 rounded-xl">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assessment Timer</p>
              <p className="text-sm font-bold text-slate-200">{durationMinutes} Minutes Limit</p>
            </div>
          </div>
        </div>

        {/* Success Modal Notification Banner */}
        {success && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800/40 rounded-2xl text-emerald-300 text-sm flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Simulated Submission Succeeded</p>
              <p className="text-xs text-emerald-400/80">{success}</p>
            </div>
          </div>
        )}

        {/* Questions Listing */}
        <form onSubmit={handleSubmitPreview} className="space-y-6">
          {questions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center text-slate-500">
              This quiz does not contain any questions. Add questions in the Teacher Console dashboard to view preview.
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-slate-200 flex items-start">
                    <span className="text-indigo-400 font-mono mr-2">{idx + 1}.</span>
                    <span>{q.text}</span>
                  </h3>
                  <span className="text-[10px] font-semibold font-mono bg-slate-950 text-slate-500 border border-slate-850 px-2 py-0.5 rounded">
                    {q.points} Pts
                  </span>
                </div>

                {/* MCQ Question choices */}
                {q.type === "MCQ" && (
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/5"
                              : "bg-slate-950/60 border-slate-850 hover:bg-slate-950 hover:border-slate-700 text-slate-350"
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TRUE_FALSE question choices */}
                {q.type === "TRUE_FALSE" && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {["True", "False"].map((choice) => {
                      // Match option text
                      const opt = q.options.find(
                        (o) => o.text.trim().toLowerCase() === choice.toLowerCase()
                      );
                      const optId = opt ? opt.id : choice;
                      const isSelected = selectedAnswers[q.id] === optId;

                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optId)}
                          className={`w-full text-center p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-200 shadow-md"
                              : "bg-slate-950/60 border-slate-850 hover:bg-slate-950 hover:border-slate-700 text-slate-350"
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* SHORT_ANSWER input */}
                {q.type === "SHORT_ANSWER" && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={textAnswers[q.id] || ""}
                      onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                      placeholder="Type your short answer response choice..."
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            ))
          )}

          {questions.length > 0 && !success && (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
              >
                Submit Simulated Attempt
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
