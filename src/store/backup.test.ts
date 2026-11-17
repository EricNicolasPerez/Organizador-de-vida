import { expect, test } from "vitest";
import { backupFileName, parseBackup, serializeBackup } from "./backup";
import { emptyData } from "./seed";

const ERR = "El archivo no es una copia válida del Organizador";

test("round trip keeps the data", () => {
  const data = emptyData();
  const r = parseBackup(serializeBackup(data));
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.data).toEqual(data);
});

test("emptyData seeds the 10 default categories", () => {
  const d = emptyData();
  expect(d.categories.filter((c) => c.kind === "expense").map((c) => c.name))
    .toEqual(["Comida", "Transporte", "Casa", "Servicios", "Salud", "Ocio", "Compras", "Otros"]);
  expect(d.categories.filter((c) => c.kind === "income").map((c) => c.name)).toEqual(["Sueldo", "Otros"]);
});

test.each(["{not json", JSON.stringify({ version: 2 }), JSON.stringify({ ...emptyData(), movements: undefined }), "[]", "null"])(
  "rejects %s", (text) => {
    expect(parseBackup(text)).toEqual({ ok: false, error: ERR });
  },
);

test("backupFileName", () => {
  expect(backupFileName(new Date(2026, 10, 17))).toBe("organizador-2026-11-17.json");
});
