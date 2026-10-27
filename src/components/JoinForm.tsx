"use client";

import { keepValues } from "./forms";
import { useActionState, useMemo, useState } from "react";
import { join } from "@/app/actions/auth";
import { ANIMALS, getAnimal } from "@/lib/animals";
import { Avatar } from "./Avatar";

const ADJECTIVES = [
  "Sparkly", "Funky", "Jazzy", "Groovy", "Cosmic", "Fancy", "Sneaky", "Bubbly", "Dancing", "Disco",
  "Party", "Glitter", "Turbo", "Snazzy", "Zesty", "Breezy", "Chill", "Mighty", "Lucky", "Wobbly",
];

function suggestName(animal: string) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${adj} ${getAnimal(animal)?.name ?? ""}`.trim().slice(0, 24);
}

export function JoinForm({ taken, inviteRequired, next }: { taken: string[]; inviteRequired: boolean; next: string }) {
  const [state, action, pending] = useActionState(join, undefined);
  const [animal, setAnimal] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [query, setQuery] = useState("");
  const takenSet = useMemo(() => new Set(taken), [taken]);

  const visible = ANIMALS.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));
  const free = ANIMALS.filter((a) => !takenSet.has(a.slug));

  function choose(slug: string) {
    setAnimal(slug);
    if (!nameTouched) setName(suggestName(slug));
  }

  return (
    <form onSubmit={keepValues(action)} className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <input className="input" placeholder="Search animals…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button
            type="button"
            className="btn btn-sun btn-small shrink-0"
            disabled={free.length === 0}
            onClick={() => choose(free[Math.floor(Math.random() * free.length)].slug)}
          >
            🎲 Surprise me
          </button>
        </div>
        <div className="grid max-h-[420px] grid-cols-5 gap-2 overflow-y-auto p-1 sm:grid-cols-7">
          {visible.map((a) => {
            const isTaken = takenSet.has(a.slug);
            const selected = animal === a.slug;
            return (
              <button
                key={a.slug}
                type="button"
                disabled={isTaken}
                onClick={() => choose(a.slug)}
                title={isTaken ? `${a.name} (taken)` : a.name}
                className={`flex flex-col items-center gap-1 rounded-2xl p-1.5 text-[11px] font-bold transition
                  ${selected ? "scale-105 bg-pink/15 ring-2 ring-pink" : "hover:bg-line/50"}
                  ${isTaken ? "opacity-25 grayscale" : ""}`}
              >
                <Avatar animal={a.slug} size="md" />
                <span className="w-full truncate">{a.name}</span>
              </button>
            );
          })}
          {visible.length === 0 && <p className="col-span-full py-8 text-center text-ink-soft">No animals match.</p>}
        </div>
      </div>

      <div className="card flex flex-col gap-4 self-start">
        <div className="flex flex-col items-center gap-2 py-2">
          {animal ? (
            <Avatar key={animal} animal={animal} size="xl" className="animate-pop" />
          ) : (
            <span className="flex size-28 items-center justify-center rounded-full border-2 border-dashed border-line text-4xl">
              ❔
            </span>
          )}
          <span className="font-display text-xl font-bold">{name || "Pick an animal"}</span>
        </div>
        <input type="hidden" name="animal" value={animal} />
        <input type="hidden" name="next" value={next} />
        <label>
          <span className="label">Your party name</span>
          <input
            className="input"
            name="name"
            maxLength={24}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />
        </label>
        <label>
          <span className="label">Passcode</span>
          <input className="input" name="passcode" type="password" minLength={4} required autoComplete="new-password" />
          <span className="mt-1 block text-xs text-ink-soft">So you can log back in on another device.</span>
        </label>
        {inviteRequired && (
          <label>
            <span className="label">Invite code</span>
            <input className="input" name="invite" required autoComplete="off" />
          </label>
        )}
        {state?.error && <p className="error-box">{state.error}</p>}
        <button className="btn btn-primary" disabled={pending || !animal}>
          {pending ? "Joining…" : "Let's party 🎉"}
        </button>
      </div>
    </form>
  );
}
