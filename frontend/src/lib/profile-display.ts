/** Fallback label wherever no one is signed in (guest-mode testing, or logged out). */
export const GUEST_LABEL = "Guest";

/** Up to two initials for an avatar badge, from a real name or the guest fallback. */
export function initialsFor(name: string | undefined): string {
  const source = name?.trim() || GUEST_LABEL;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return initials || "?";
}
