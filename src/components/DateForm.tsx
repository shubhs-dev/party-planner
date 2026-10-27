"use client";

import { keepValues } from "./forms";
import { useActionState, useRef } from "react";
import { addDate } from "@/app/actions/dates";
import { burst, originOf } from "./confetti";

export function DateForm({ partyId }: { partyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(async (prev: { error?: string } | undefined, form: FormData) => {
    const res = await addDate(partyId, prev, form);
    if (!res?.error) {
      formRef.current?.reset();
      if (submitRef.current) burst(originOf(submitRef.current));
    }
    return res;
  }, undefined);

  return (
    <form ref={formRef} onSubmit={keepValues(action)} className="card flex flex-col gap-3">
      <h3 className="text-xl font-bold">Suggest a date 📅</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label>
          <span className="label">Date</span>
          <input className="input" type="date" name="date" required />
        </label>
        <label>
          <span className="label">Time (optional)</span>
          <input className="input" type="time" name="time" />
        </label>
      </div>
      <label>
        <span className="label">Note (optional)</span>
        <input className="input" name="note" maxLength={200} placeholder="Right after the all-hands?" />
      </label>
      {state?.error && <p className="error-box">{state.error}</p>}
      <button ref={submitRef} className="btn btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add date"}
      </button>
    </form>
  );
}
