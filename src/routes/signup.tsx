import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/mindforge/AuthLayout";
import { GoogleButton } from "@/components/mindforge/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeAuthError,
  resendSignUpOtp,
  signInWithGoogle,
  signUpWithEmail,
  verifyEmailOtp,
} from "@/services/auth";

const title = "Create your MindForge account";
const description =
  "Join MindForge and start debating an AI that challenges your reasoning every single day.";

const RESEND_COOLDOWN_SECONDS = 60;

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Counts the resend cooldown down to zero once a second.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { needsEmailConfirmation } = await signUpWithEmail(email, password, name);
      if (needsEmailConfirmation) {
        setStep("otp");
        setOtp("");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyEmailOtp(email, otp);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await resendSignUpOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describeAuthError(err));
    }
  }

  function handleChangeEmail() {
    setStep("details");
    setOtp("");
    setError(null);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={step === "details" ? "Create your account" : "Verify your email"}
      subtitle={
        step === "details"
          ? "Free to start. Your first motion takes two minutes."
          : `We sent a 6-digit code to ${email}`
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {step === "details" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Arjun Mehta"
              className="h-11 bg-secondary/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 bg-secondary/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-11 bg-secondary/40"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-gradient-brand text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="h-11 bg-secondary/40 text-center text-lg tracking-[0.5em]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="h-11 w-full bg-gradient-brand text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify email
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleChangeEmail}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Wrong email? Edit
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {step === "details" && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton label="Sign up with Google" onClick={handleGoogle} />
        </>
      )}
    </AuthLayout>
  );
}