"use client";

import { keepValues } from "./forms";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form onSubmit={keepValues(action)} className="card flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label>
        <span className="label">Party name</span>
        <input className="input" name="name" required autoComplete="username" />
      </label>
      <label>
        <span className="label">Passcode</span>
        <input className="input" name="passcode" type="password" required autoComplete="current-password" />
      </label>
      {state?.error && <p className="error-box">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
