"use client";

import { useState, useSyncExternalStore } from "react";

// Ticks once a second on the client; null during SSR so server and client HTML match.
function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const useNow = () =>
  useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

function formatLeft(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** "closes in 2d 4h" style countdown. */
export function Countdown({ to, prefix = "Closes in" }: { to: number; prefix?: string }) {
  const now = useNow();
  if (now === null) return <span className="chip">⏳ {prefix} …</span>;
  const left = to - now;
  return (
    <span className="chip bg-sun/40" title={new Date(to).toLocaleString()}>
      ⏳ {left > 0 ? `${prefix} ${formatLeft(left)}` : "Closing… refresh to see what's next"}
    </span>
  );
}

/** Local date+time picker that submits epoch ms in a hidden input called `name`. */
export function DeadlineInput({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState("");
  const ms = value ? new Date(value).getTime() : NaN;
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      <input type="hidden" name={name} value={Number.isFinite(ms) ? ms : ""} />
    </label>
  );
}

/** Formats a timestamp in the viewer's timezone (client only, to avoid server-timezone surprises). */
export function LocalTime({ ms }: { ms: number }) {
  const now = useNow();
  if (now === null) return null;
  return <>{new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</>;
}
