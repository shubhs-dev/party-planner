"use client";

import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that runs a `useActionState` action WITHOUT React's automatic form reset
 * (which would wipe what people typed when the server returns a validation error).
 * Forms that should clear on success reset themselves explicitly.
 */
export function keepValues(action: (form: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => action(form));
  };
}
