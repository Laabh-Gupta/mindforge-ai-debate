import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/hooks/use-session-clock";

export function VoiceRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState("");
  const [type, setType] = useState("audio/webm");
  const mounted = useRef(true);
  const requesting = useRef(false);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (seconds >= 600 && recorder.current?.state !== "inactive") recorder.current?.stop();
  }, [seconds]);
  async function start() {
    if (requesting.current || state !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Audio recording requires a supported browser and a secure connection.");
      return;
    }
    requesting.current = true;
    setWaiting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      chunks.current = [];
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const instance = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = instance;
      instance.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      instance.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setType(instance.mimeType);
        setUrl(URL.createObjectURL(new Blob(chunks.current, { type: instance.mimeType })));
        setState("idle");
      };
      instance.start(1000);
      setState("recording");
      setSeconds(0);
      setUrl("");
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      toast.error(
        "Microphone access was denied or no microphone is available. You can still type your response.",
      );
    } finally {
      requesting.current = false;
      if (mounted.current) setWaiting(false);
    }
  }
  return (
    <details className="rounded-lg border border-border px-4 py-3">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Record a practice answer
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        Record, listen, and refine. Audio stays in this tab. Submit a written answer for feedback;
        voice analysis is planned.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {state === "idle" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={waiting}
            onClick={() => void start()}
          >
            <Mic className="size-4" />
            {waiting ? "Opening microphone…" : "Record"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (state === "paused") {
                  recorder.current?.resume();
                  setState("recording");
                } else {
                  recorder.current?.pause();
                  setState("paused");
                }
              }}
            >
              {state === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
              {state === "paused" ? "Resume recording" : "Pause recording"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => recorder.current?.stop()}
            >
              <Square className="size-4" />
              Stop recording
            </Button>
          </>
        )}
        <span className="font-mono text-xs" aria-live="off">
          {formatDuration(seconds)} / 10:00
        </span>
        {state !== "idle" && (
          <span className="text-xs text-primary">
            {state === "recording" ? "Recording" : "Paused"}
          </span>
        )}
      </div>
      {url && (
        <div className="mt-3 space-y-2">
          <audio controls src={url} className="max-w-full" aria-label="Recorded answer" />
          <a
            href={url}
            download={`mindforge-recording.${type.includes("mp4") ? "m4a" : "webm"}`}
            className="inline-flex items-center gap-2 text-sm text-primary"
          >
            <Download className="size-4" />
            Download recording
          </a>
        </div>
      )}
    </details>
  );
}
