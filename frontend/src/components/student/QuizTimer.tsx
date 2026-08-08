import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface QuizTimerProps {
  initialTimeLeftSeconds: number;
  onTimeExpired: () => void;
}

export function QuizTimer({ initialTimeLeftSeconds, onTimeExpired }: QuizTimerProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(initialTimeLeftSeconds);

  useEffect(() => {
    setTimeLeftSeconds(initialTimeLeftSeconds);
  }, [initialTimeLeftSeconds]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      onTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeExpired]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  // Visual warning: change color and pulse timer when less than 5 minutes remaining
  const isCritical = minutes < 5;

  return (
    <div
      className={`flex items-center space-x-2 px-4 py-2 border rounded-xl font-mono font-bold text-sm transition-colors ${
        isCritical
          ? "bg-rose-950/40 border-rose-800/50 text-rose-300 animate-pulse"
          : "bg-amber-950/40 border-amber-800/50 text-amber-300"
      }`}
    >
      <Clock className={`w-4 h-4 ${isCritical ? "text-rose-400" : "text-amber-400 animate-pulse"}`} />
      <span>
        Time Remaining: {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
