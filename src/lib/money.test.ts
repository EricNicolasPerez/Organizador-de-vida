import { describe, expect, test } from "vitest";
import { formatMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  test.each([
    ["1.234,50", 123450],
    ["1234.5", 123450],
    ["  500 ", 50000],
    ["1234,5", 123450],
    ["1.234.567,89", 123456789],
    ["0,99", 99],
    ["1.234", 123400],
    ["25.000", 2500000],
  ])("parses %s", (input, cents) => {
    expect(parseAmount(input)).toBe(cents);
  });

  test.each(["", "0", "-3", "abc", "1,234,5", "12,345"])("rejects %s", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

test("formatMoney uses Argentine format", () => {
  expect(formatMoney(123450, "ARS")).toContain("1.234,50");
  expect(formatMoney(-5000, "USD")).toContain("50,00");
});
