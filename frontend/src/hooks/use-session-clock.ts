import { useEffect, useState } from "react";
/** Accumulates fractional ticks; early timer callbacks must not discard practice time. */
export function useSessionClock(active: boolean, initial = 0) {
  const [elapsed, setElapsed] = useState(initial);
  useEffect(() => {
    if (!active) return;
    let previous = performance.now();
    let fraction = 0;
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === "visible") {
        fraction += Math.min(2000, Math.max(0, now - previous)) / 1000;
        const whole = Math.floor(fraction);
        if (whole) {
          setElapsed((s) => Math.min(86400, s + whole));
          fraction -= whole;
        }
      }
      previous = now;
    };
    const visibility = () => {
      previous = performance.now();
    };
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active]);
  return [elapsed, setElapsed] as const;
}
export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
