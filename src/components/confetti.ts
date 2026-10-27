"use client";

import confetti from "canvas-confetti";

const COLORS = ["#ff4f8b", "#ffc93c", "#2ec4a6", "#4d96ff", "#8b5cf6"];

export function burst(origin?: { x: number; y: number }) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({ particleCount: 40, spread: 60, startVelocity: 28, scalar: 0.8, colors: COLORS, origin });
}

export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors: COLORS });
    confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Origin for a burst, from the element that was clicked. */
export function originOf(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}
