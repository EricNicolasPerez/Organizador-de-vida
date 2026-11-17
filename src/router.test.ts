import { expect, test } from "vitest";
import { matchRoute, parseHash } from "./router";

test("parseHash splits path and query", () => {
  expect(parseHash("#/finanzas/movimiento/abc?x=1&mes=2026-11")).toEqual({
    path: "/finanzas/movimiento/abc", query: { x: "1", mes: "2026-11" },
  });
});

test("empty or bare hash is the home path", () => {
  expect(parseHash("")).toEqual({ path: "/", query: {} });
  expect(parseHash("#")).toEqual({ path: "/", query: {} });
  expect(parseHash("#/")).toEqual({ path: "/", query: {} });
});

test("matchRoute extracts params and rejects non-matches", () => {
  expect(matchRoute("/finanzas/movimiento/:id", "/finanzas/movimiento/abc")).toEqual({ id: "abc" });
  expect(matchRoute("/entrenamiento/historial/:date", "/entrenamiento/historial/2026-11-17")).toEqual({ date: "2026-11-17" });
  expect(matchRoute("/finanzas", "/finanzas/cuentas")).toBeNull();
  expect(matchRoute("/", "/")).toEqual({});
});
