import { useEffect, useState } from "react";
export function ConnectionStatus() {
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    const listener = (event: Event) => setConnecting(Boolean((event as CustomEvent).detail));
    window.addEventListener("mindforge:connection", listener);
    return () => window.removeEventListener("mindforge:connection", listener);
  }, []);
  if (!connecting) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm"
    >
      Connecting to practice. The server may take a minute to wake up.
    </div>
  );
}
