import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/mindforge/AuthLayout";
import { GoogleButton } from "@/components/mindforge/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeAuthError, signInWithGoogle, signUpWithEmail } from "@/services/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create an account | Argulab" }] }),
  component: SignupPage,
});
function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email, password, name);
      await navigate({ to: "/dashboard" });
    } catch (error) {
      setError(describeAuthError(error));
    } finally {
      setLoading(false);
    }
  }
  async function google() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(describeAuthError(error));
      setLoading(false);
    }
  }
  return (
    <AuthLayout
      title="Make room for better thinking"
      subtitle="Save your practice and pick up where you left off."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
            className="h-11"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters. A longer passphrase works well.
          </p>
        </div>
        <Button type="submit" disabled={loading || !name.trim()} className="h-11 w-full">
          {loading && <Loader2 className="size-4 animate-spin" />} Create account
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton label="Continue with Google" onClick={google} disabled={loading} />
    </AuthLayout>
  );
}
