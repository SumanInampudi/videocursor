"use client";

import { useActionState, useEffect } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const redirecting = Boolean(state?.redirectTo);

  useEffect(() => {
    if (state?.redirectTo) {
      window.location.replace(state.redirectTo);
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        placeholder="you@restaurant.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state?.error && <p className="text-sm text-servora-red">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending || redirecting}>
        {pending || redirecting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
