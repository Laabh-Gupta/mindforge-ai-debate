import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass rounded-3xl p-7 sm:p-9">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}