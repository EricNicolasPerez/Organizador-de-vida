// The built-in gym routines appear on first open, and do not come back after being deleted.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("dialog", (d) => d.accept());
  const base = "http://localhost:4173/Organizador-de-vida/";
  const body = async () => (await p.textContent("body")) || "";
  await p.goto(base + "#/"); await p.waitForTimeout(400);
  console.log("home hoy te toca Espalda y brazo:", (await body()).includes("Espalda y brazo"));
  await p.goto(base + "#/entrenamiento/rutinas"); await p.waitForTimeout(200);
  console.log("one Gym routine active:", (await p.locator('a:has-text("Gym")').count()) === 1 && (await body()).includes("Activa"));
  await p.reload(); await p.waitForTimeout(400);
  console.log("still one after reload:", (await p.locator('a:has-text("Gym")').count()) === 1);
  await p.click('a:has-text("Gym")'); await p.waitForTimeout(200);
  await p.click('button:has-text("Borrar rutina")'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(400);
  console.log("deleted stays deleted:", (await p.locator('a:has-text("Gym")').count()) === 0);
  console.log("errors:", errors);
  await b.close();
})();
