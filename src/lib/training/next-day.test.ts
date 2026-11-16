import { expect, test } from "vitest";
import { nextRoutineDay } from "./next-day";
import type { RoutineDay } from "./types";

const days: RoutineDay[] = [
  { id: "c", position: 2, name: "Día C" },
  { id: "a", position: 0, name: "Día A" },
  { id: "b", position: 1, name: "Día B" },
];

test("no days → null", () => expect(nextRoutineDay([], null)).toBeNull());
test("no previous session → first day by position", () => expect(nextRoutineDay(days, null)?.id).toBe("a"));
test("after A comes B", () => expect(nextRoutineDay(days, "a")?.id).toBe("b"));
test("after last day wraps to first", () => expect(nextRoutineDay(days, "c")?.id).toBe("a"));
test("unknown last day (deleted) falls back to first", () => expect(nextRoutineDay(days, "zzz")?.id).toBe("a"));
