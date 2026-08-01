"use client";

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
    // Trigger expiration immediate exit if time left is zero or less
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

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 font-mono font-bold text-sm">
      <Clock className="w-4 h-4 animate-pulse text-amber-400" />
      <span>
        Time Remaining: {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
