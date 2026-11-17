// Just looking at a session must not create a draft; "Continuar" appears only after an edit.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on("dialog", (d) => d.accept());
  const base = "http://localhost:4173/Organizador-de-vida/";
  const body = async () => (await p.textContent("body")) || "";
  await p.goto(base + "#/entrenamiento/rutinas"); await p.waitForSelector("h1");
  await p.fill('input[placeholder="Ej. Fuerza 3 días"]', "PPL"); await p.click('button:has-text("Crear")'); await p.waitForSelector('text=Agregar día');
  await p.fill('input[placeholder^="Día A"]', "Día A"); await p.click('button:has-text("Agregar día")');
  await p.click('summary:has-text("Agregar ejercicio")'); await p.fill('input[name=newName]', "Press banca"); await p.click('button:has-text("Agregar")'); await p.waitForTimeout(200);
  await p.goto(base + "#/entrenamiento/sesion"); await p.waitForSelector("h1"); // free session, no edits
  await p.goto(base + "#/entrenamiento"); await p.waitForTimeout(200);
  console.log("no draft after just visiting (button says Empezar):", (await body()).includes("Empezar") && !(await body()).includes("Continuar"));
  await p.click('a:has-text("Empezar")'); await p.waitForSelector('h1:has-text("Día A")');
  console.log("fresh session has no resume banner:", !(await body()).includes("Sesión sin terminar"));
  await p.fill('[aria-label="Reps serie 1"]', "12"); await p.waitForTimeout(200);
  await p.goto(base + "#/entrenamiento"); await p.waitForTimeout(200);
  console.log("after an edit the draft exists (Continuar):", (await body()).includes("Continuar"));
  await b.close();
})();
