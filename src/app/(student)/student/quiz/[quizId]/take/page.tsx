import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startQuizAttemptAction, finalizeQuizAttemptAction } from "@/app/(student)/student/actions";
import QuizRunner from "./QuizRunner";
import { redirect } from "next/navigation";
import { seededShuffle } from "@/lib/shuffle";
import { Clock } from "lucide-react";
import Link from "next/link";

interface TakeQuizPageProps {
  params: Promise<{ quizId: string }>;
}

export default async function TakeQuizPage({ params }: TakeQuizPageProps) {
  const { quizId } = await params;
  const student = await requireRole(["STUDENT"]);
  const now = new Date();

  // Load or initialize the attempt (regenerating activeSessionToken on reload)
  const result = await startQuizAttemptAction(quizId);
  const attemptId = result.attemptId;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true, // Load existing draft answers to handle page re-opens
      quiz: {
        include: {
          subject: true,
          questions: {
            include: {
              question: {
                include: {
                  options: {
                    select: { id: true, text: true }, // Verify no isCorrect field leakage
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!attempt) {
    redirect("/student/dashboard");
  }

  // EXPIRED-TIME CHECK: If already submitted or time has run out
  const maxAllowedTime = new Date(attempt.startedAt.getTime() + attempt.quiz.durationMinutes * 60 * 1000 + 15000); // 15s grace buffer
  const isExpiredTime = now > maxAllowedTime;

  if (attempt.submittedAt || isExpiredTime) {
    // If expired but not marked submitted in database yet, trigger full backend grading auto-finalization
    if (!attempt.submittedAt && isExpiredTime) {
      await finalizeQuizAttemptAction(attempt.id, undefined, attempt.activeSessionToken || undefined);
    }

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
          <div className="inline-flex p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/60 mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Time Has Expired!</h1>
          <p className="text-sm text-slate-400 mt-2">
            Your quiz attempt is completed. Further answer submissions are blocked.
          </p>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/student/dashboard"
              className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate remaining seconds based on server dates to bypass client clock alterations
  const initialTimeLeftSeconds = Math.max(0, Math.floor((maxAllowedTime.getTime() - now.getTime()) / 1000));

  // Map any previously saved answers to pre-populate student forms
  const initialSelectedAnswers: Record<string, string> = {};
  const initialTextAnswers: Record<string, string> = {};

  attempt.answers.forEach((ans) => {
    if (ans.selectedOptionId) {
      initialSelectedAnswers[ans.questionId] = ans.selectedOptionId;
    }
    if (ans.textAnswer) {
      initialTextAnswers[ans.questionId] = ans.textAnswer;
    }
  });

  // Map & sanitise questions
  const unshuffledQuestions = attempt.quiz.questions.map((qLink) => ({
    id: qLink.question.id,
    text: qLink.question.text,
    type: qLink.question.type,
    points: qLink.question.points,
    // Server-side option shuffle seeded by attemptId + questionId
    options: seededShuffle(
      qLink.question.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
      `${attempt.id}-${qLink.question.id}`
    ),
  }));

  // Server-side question shuffle seeded by attemptId
  const sanitizedQuestions = seededShuffle(unshuffledQuestions, attempt.id);

  return (
    <div className="min-h-screen bg-slate-950">
      <QuizRunner
        attemptId={attempt.id}
        startedAt={attempt.startedAt.toISOString()}
        initialTimeLeftSeconds={initialTimeLeftSeconds}
        activeSessionToken={attempt.activeSessionToken || ""}
        quizTitle={attempt.quiz.title}
        subjectCode={attempt.quiz.subject.code}
        questions={sanitizedQuestions}
        initialSelectedAnswers={initialSelectedAnswers}
        initialTextAnswers={initialTextAnswers}
      />
    </div>
  );
}
