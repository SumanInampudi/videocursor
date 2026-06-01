"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await loginAction(null, formData)) ?? null;
    },
    null
  );

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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
