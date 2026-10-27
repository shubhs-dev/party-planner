"use client";

import { keepValues } from "./forms";
import { useActionState } from "react";
import { createParty } from "@/app/actions/parties";
import { DeadlineInput } from "./time";

export function NewPartyForm() {
  const [state, action, pending] = useActionState(createParty, undefined);
  return (
    <form onSubmit={keepValues(action)} className="card flex flex-col gap-4">
      <label>
        <span className="label">Party name</span>
        <input className="input" name="title" required maxLength={80} placeholder="End of Year Bash 2026" />
      </label>
      <label>
        <span className="label">What&apos;s the vibe? (optional)</span>
        <textarea
          className="input min-h-24"
          name="description"
          maxLength={500}
          placeholder="Team dinner + something fun after. Budget around $60 a head."
        />
      </label>
      <DeadlineInput name="deadline" label="Stop collecting ideas at (optional)" />
      <p className="-mt-2 text-xs text-ink-soft">
        When a deadline passes the party moves on by itself. You can always move it along early.
      </p>
      {state?.error && <p className="error-box">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Setting up…" : "Create party 🎉"}
      </button>
    </form>
  );
}
