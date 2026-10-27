"use client";

import { useEffect } from "react";
import { celebrate } from "./confetti";

/** Fires a confetti shower once when shown. */
export function Celebrate() {
  useEffect(() => celebrate(), []);
  return null;
}
