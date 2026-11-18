// Importing a routines file adds routines without touching existing finance data.
const { chromium } = require("playwright");
(async () => {
  const file = process.argv[2];
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  const base = "http://localhost:4173/Organizador-de-vida/";
  const body = async () => (await p.textContent("body")) || "";
  await p.goto(base + "#/finanzas/cuentas"); await p.waitForSelector("h1");
  await p.fill('input[name=name]', "Efectivo"); await p.fill('#initialBalance', "1000"); await p.click('text=Crear cuenta'); await p.waitForTimeout(200);
  await p.goto(base + "#/ajustes"); await p.waitForSelector("h1");
  await p.setInputFiles('[aria-label="Archivo de rutinas"]', file); await p.waitForTimeout(300);
  console.log("success message:", (await body()).includes("Rutinas agregadas: Gym"));
  await p.goto(base + "#/finanzas/cuentas"); await p.waitForTimeout(200);
  console.log("finance kept:", (await body()).includes("Efectivo"));
  await p.goto(base + "#/"); await p.waitForTimeout(200);
  console.log("home hoy te toca Espalda y brazo:", (await body()).includes("Espalda y brazo"));
  await p.goto(base + "#/entrenamiento/rutinas"); await p.waitForTimeout(200);
  await p.click('a:has-text("Gym")'); await p.waitForTimeout(300);
  const t = await body();
  console.log("days:", ["Espalda y brazo", "Pecho", "Piernas (sin flexión profunda)"].every((d) => t.includes(d)), "| remo:", t.includes("Remo sentado"), "| 12,5:", t.includes("12.5 kg") || t.includes("12,5 kg"));
  await p.screenshot({ path: process.argv[3], fullPage: true });
  await p.goto(base + "#/"); await p.click('a:has-text("Empezar")'); await p.waitForTimeout(300);
  console.log("session Remo a un brazo kg:", await p.inputValue('[aria-label="Kg serie 1"] >> nth=3').catch(() => "?"));
  console.log("errors:", errors);
  await b.close();
})();
