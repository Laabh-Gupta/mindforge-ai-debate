import { useEffect, type RefObject } from "react";
import type { PracticeSession } from "@/lib/practice-types";
/** Commit the latest draft on navigation, tab closure, or app backgrounding. */
export function useFlushSession(
  snapshot: RefObject<PracticeSession | null>,
  finished: RefObject<boolean>,
  save: RefObject<(s: PracticeSession) => void>,
) {
  useEffect(() => {
    const flush = () => {
      if (snapshot.current && !finished.current) save.current(snapshot.current);
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [snapshot, finished, save]);
}
