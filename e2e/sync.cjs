// Two tabs (same origin) must not silently overwrite each other's data.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const base = "http://localhost:4173/Organizador-de-vida/";
  const A = await ctx.newPage(); const B = await ctx.newPage();
  for (const p of [A, B]) { await p.goto(base + "#/finanzas/cuentas"); await p.waitForSelector("h1"); }
  // A creates account "Efectivo" while B is open with the old (empty) document
  await A.fill('input[name=name]', "Efectivo"); await A.fill('#initialBalance', "1000"); await A.click('text=Crear cuenta'); await A.waitForTimeout(300);
  // B (stale) creates "Banco": must NOT wipe Efectivo
  await B.fill('input[name=name]', "Banco"); await B.fill('#initialBalance', "5"); await B.click('text=Crear cuenta'); await B.waitForTimeout(500);
  const bBody = await B.textContent("body");
  console.log("B reloaded A's data:", bBody.includes("Efectivo"), "| B shows conflict notice:", bBody.includes("otra pestaña"));
  await A.reload(); await A.waitForSelector("h1");
  console.log("A still has Efectivo after reload:", (await A.textContent("body")).includes("Efectivo"));
  await b.close();
})();
