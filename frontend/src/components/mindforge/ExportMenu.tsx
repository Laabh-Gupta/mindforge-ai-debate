import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sessionReportText, downloadText, printReport } from "@/lib/session-export";
import type { PracticeSession } from "@/lib/practice-types";

export function ExportMenu({ session }: { session: PracticeSession }) {
  const text = sessionReportText(session);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Export session
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => printReport(text, session.modeName)}>
          PDF / Print report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadText(text, `mindforge-${session.id}.txt`)}>
          Download TXT
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard
              .writeText(text)
              .then(() => toast.success("Report copied"))
              .catch(() => toast.error("Clipboard access is unavailable. Download TXT instead."));
          }}
        >
          Copy transcript & review
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (navigator.share)
              void navigator.share({ title: session.modeName, text }).catch((error: Error) => {
                if (error.name !== "AbortError")
                  toast.error("Sharing is unavailable. Copy or download the report.");
              });
            else
              void navigator.clipboard
                .writeText(text)
                .then(() => toast.success("Report copied. You can share it wherever you choose."))
                .catch(() => toast.error("Download TXT to share the report."));
          }}
        >
          Share report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
