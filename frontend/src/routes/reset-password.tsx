import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { resetPassword } from "@/services/auth";
import { AuthLayout } from "@/components/mindforge/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password | MindForge" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string | undefined; error?: string | undefined } => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
    error: typeof search["error"] === "string" ? search["error"] : "",
  }),
  component: ResetPasswordPage,
});
function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const { token, error } = Route.useSearch();
  const ready = !!token && !error;
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      await resetPassword(password, token!);
      setDone(true);
    } catch {
      toast.error(
        "The password could not be changed. Request a fresh recovery link and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Use at least 8 characters."
      footer={
        <Link to="/login" className="text-primary underline underline-offset-4">
          Return to sign in
        </Link>
      }
    >
      {done ? (
        <p>Password updated. You can now sign in with your new password.</p>
      ) : !ready ? (
        <p className="text-sm text-muted-foreground">
          Open the latest recovery link from your email.{" "}
          <Link to="/forgot-password" className="text-primary underline underline-offset-4">
            Request a new link
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button disabled={saving || password.length < 8}>
            {saving ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
