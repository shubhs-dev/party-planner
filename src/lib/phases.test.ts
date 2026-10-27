import { describe, expect, it } from "vitest";
import {
  deadlineExpired,
  leader,
  nextPhase,
  runoffSurvivors,
  tally,
  tiedForFirst,
  voteBudget,
  voteError,
  votingKind,
} from "./phases";

describe("voteBudget", () => {
  it("is a third of the options, between 1 and 5", () => {
    expect(voteBudget(0)).toBe(0);
    expect(voteBudget(1)).toBe(1);
    expect(voteBudget(3)).toBe(1);
    expect(voteBudget(4)).toBe(2);
    expect(voteBudget(9)).toBe(3);
    expect(voteBudget(13)).toBe(5);
    expect(voteBudget(40)).toBe(5);
  });
});

describe("phases", () => {
  it("walks ideas → done", () => {
    expect(nextPhase("ideas")).toBe("idea_voting");
    expect(nextPhase("idea_voting")).toBe("dates");
    expect(nextPhase("dates")).toBe("date_voting");
    expect(nextPhase("date_voting")).toBe("done");
    expect(nextPhase("done")).toBeNull();
  });

  it("knows which phases are votes", () => {
    expect(votingKind("idea_voting")).toBe("idea");
    expect(votingKind("date_voting")).toBe("date");
    expect(votingKind("ideas")).toBeNull();
  });
});

const opts = [
  { id: "a", createdAt: 1 },
  { id: "b", createdAt: 2 },
  { id: "c", createdAt: 3 },
  { id: "d", createdAt: 4 },
];
const v = (...ids: string[]) => ids.map((optionId) => ({ optionId }));

describe("tally", () => {
  it("sorts by votes, then by who was added first", () => {
    const rows = tally(opts, v("c", "c", "b", "d", "zzz"));
    expect(rows).toEqual([
      { id: "c", count: 2 },
      { id: "b", count: 1 },
      { id: "d", count: 1 },
      { id: "a", count: 0 },
    ]);
    expect(leader(rows)).toBe("c");
  });

  it("reports ties for first", () => {
    expect(tiedForFirst(tally(opts, v("a", "b")))).toEqual(["a", "b"]);
    expect(tiedForFirst([])).toEqual([]);
    expect(leader([])).toBeNull();
  });
});

describe("runoffSurvivors", () => {
  it("keeps the top n plus anyone tied with n-th place", () => {
    const rows = tally(opts, v("a", "a", "b", "c"));
    expect(runoffSurvivors(rows, 1)).toEqual(["a"]);
    expect(runoffSurvivors(rows, 2)).toEqual(["a", "b", "c"]);
    expect(runoffSurvivors(rows, 10)).toEqual(["a", "b", "c", "d"]);
    expect(runoffSurvivors(rows, 0)).toEqual([]);
  });
});

describe("voteError", () => {
  const active = ["a", "b", "c", "d"]; // budget 2
  it("allows votes within budget", () => {
    expect(voteError({ optionId: "a", activeOptionIds: active, myVoteOptionIds: [] })).toBeNull();
    expect(voteError({ optionId: "b", activeOptionIds: active, myVoteOptionIds: ["a"] })).toBeNull();
  });
  it("rejects double votes, over-budget votes and inactive options", () => {
    expect(voteError({ optionId: "a", activeOptionIds: active, myVoteOptionIds: ["a"] })).toMatch(/already/);
    expect(voteError({ optionId: "c", activeOptionIds: active, myVoteOptionIds: ["a", "b"] })).toMatch(/out of votes/);
    expect(voteError({ optionId: "x", activeOptionIds: active, myVoteOptionIds: [] })).toMatch(/isn't in/);
  });
});

describe("deadlineExpired", () => {
  it("only fires once the deadline passed and there is something to vote on", () => {
    const base = { phase: "ideas" as const, now: 100, optionCount: 2 };
    expect(deadlineExpired({ ...base, deadline: null })).toBe(false);
    expect(deadlineExpired({ ...base, deadline: 101 })).toBe(false);
    expect(deadlineExpired({ ...base, deadline: 100 })).toBe(true);
    expect(deadlineExpired({ ...base, deadline: 50, optionCount: 0 })).toBe(false);
    expect(deadlineExpired({ ...base, phase: "done", deadline: 50 })).toBe(false);
  });
});
