"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuizAction } from "@/app/(teacher)/teacher/actions";
import { BookOpen, Calendar, Clock, CheckSquare } from "lucide-react";

interface CreateQuizFormProps {
  subjects: { id: string; name: string; code: string }[];
  questions: { id: string; text: string; type: string; points: number; subjectId: string }[];
}

export default function CreateQuizForm({ subjects, questions }: CreateQuizFormProps) {
  const router = useRouter();
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredQuestions = questions.filter(
    (q) => !selectedSubjectId || q.subjectId === selectedSubjectId
  );

  const toggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0) {
      alert("Please select at least one question from the question bank.");
      return;
    }
    setLoading(true);

    try {
      await createQuizAction({
        subjectId: selectedSubjectId,
        title,
        description,
        durationMinutes,
        startsAt,
        endsAt,
        isPublished,
        questionIds: selectedQuestionIds,
      });
      router.push("/teacher/dashboard");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl bg-slate-900 border border-slate-800 p-8 rounded-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
          <select
            required
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quiz Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mid-Term Examination 2026"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Quiz instructions for students..."
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (Minutes)</label>
          <input
            type="number"
            required
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Time (Availability Window)</label>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Time (Availability Window)</label>
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-indigo-400" />
          <span>Select Questions from Bank ({selectedQuestionIds.length} Selected)</span>
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              onClick={() => toggleQuestion(q.id)}
              className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                selectedQuestionIds.includes(q.id)
                  ? "bg-indigo-950/60 border-indigo-500/80 text-indigo-200"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedQuestionIds.includes(q.id)}
                  onChange={() => {}}
                  className="accent-indigo-500"
                />
                <span className="text-xs font-medium text-slate-200">{q.text}</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">{q.points} Pts</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
      >
        {loading ? "Publishing Quiz..." : "Create & Publish Quiz"}
      </button>
    </form>
  );
}
