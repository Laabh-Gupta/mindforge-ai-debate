export type Preferences = {
  theme: "dark" | "light" | "system";
  dailyGoal: number;
  difficulty: "adaptive" | "beginner" | "intermediate" | "advanced";
  language: "English" | "Hindi" | "Bilingual";
  reducedMotion: boolean;
  largerText: boolean;
  guestName: string;
};
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  dailyGoal: 3,
  difficulty: "adaptive",
  language: "English",
  reducedMotion: false,
  largerText: false,
  guestName: "Guest",
};
export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(localStorage.getItem("mindforge:preferences") ?? "{}");
    return {
      ...DEFAULT_PREFERENCES,
      theme: ["dark", "light", "system"].includes(value.theme) ? value.theme : "dark",
      difficulty: ["adaptive", "beginner", "intermediate", "advanced"].includes(value.difficulty)
        ? value.difficulty
        : "adaptive",
      language: ["English", "Hindi", "Bilingual"].includes(value.language)
        ? value.language
        : "English",
      dailyGoal:
        Number.isInteger(value.dailyGoal) && value.dailyGoal >= 1 && value.dailyGoal <= 10
          ? value.dailyGoal
          : 3,
      reducedMotion: value.reducedMotion === true,
      largerText: value.largerText === true,
      guestName:
        typeof value.guestName === "string" && value.guestName.trim()
          ? value.guestName.slice(0, 60)
          : "Guest",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
