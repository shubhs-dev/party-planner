import { describe, expect, it } from "vitest";
import { formatDate, formatTime, priceLabel } from "./format";

describe("format", () => {
  it("formats calendar dates without timezone drift", () => {
    expect(formatDate("2026-12-12")).toBe("Sat, Dec 12, 2026");
  });
  it("formats times", () => {
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("18:30")).toBe("6:30 PM");
    expect(formatTime("")).toBe("");
  });
  it("shows price levels", () => {
    expect(priceLabel(3)).toBe("$$$");
    expect(priceLabel(null)).toBeNull();
  });
});
