import { PHASES, type Phase } from "@/lib/db/schema";
import { PHASE_INFO, phaseIndex } from "@/lib/phases";

export function PhaseStepper({ phase }: { phase: Phase }) {
  const current = phaseIndex(phase);
  return (
    <ol className="flex items-center gap-1 sm:gap-2">
      {PHASES.map((p, i) => {
        const info = PHASE_INFO[p];
        const state = i < current ? "done" : i === current ? "now" : "later";
        return (
          <li key={p} className="flex flex-1 items-center gap-1 sm:gap-2">
            <span
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center text-[11px] font-bold sm:flex-row sm:justify-center sm:text-sm ${
                state === "now"
                  ? "bg-pink text-white shadow-[0_3px_0_0_var(--color-pink-deep)]"
                  : state === "done"
                    ? "bg-mint/20 text-ink"
                    : "bg-white/70 text-ink-soft"
              }`}
              aria-current={state === "now" ? "step" : undefined}
            >
              <span className="text-lg sm:text-base">{state === "done" ? "✅" : info.emoji}</span>
              {info.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
