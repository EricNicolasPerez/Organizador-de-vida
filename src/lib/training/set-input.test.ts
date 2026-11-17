import { expect, test } from "vitest";
import { formatSetValue, parseSetInput } from "./set-input";

test("decimal weights with comma or dot", () => {
  expect(parseSetInput("22,5", "decimal")).toBe(22.5);
  expect(parseSetInput("12.5", "decimal")).toBe(12.5);
});

test("a trailing separator while typing is a valid partial value", () => {
  expect(parseSetInput("22,", "decimal")).toBe(22);
});

test("empty means no value", () => {
  expect(parseSetInput("  ", "decimal")).toBeNull();
});

test("invalid text is rejected (undefined)", () => {
  expect(parseSetInput("abc", "decimal")).toBeUndefined();
  expect(parseSetInput("-1", "decimal")).toBeUndefined();
  expect(parseSetInput("1,2,3", "decimal")).toBeUndefined();
  expect(parseSetInput("10000", "decimal")).toBeUndefined();
});

test("integer fields reject decimals", () => {
  expect(parseSetInput("8", "integer")).toBe(8);
  expect(parseSetInput("8,5", "integer")).toBeUndefined();
});

test("formatSetValue renders with comma", () => {
  expect(formatSetValue(22.5)).toBe("22,5");
  expect(formatSetValue(null)).toBe("");
});
