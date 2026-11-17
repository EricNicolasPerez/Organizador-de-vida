# Pruebas de punta a punta

Corren contra `pnpm preview` (puerto 4173) con Playwright instalado globalmente:

```bash
pnpm build && pnpm preview --port 4173 &
NODE_PATH=$(npm root -g) node e2e/finanzas.cjs captura.png
```

Cada script imprime `true`/`false` por comprobación y `errors: []` si no hubo errores de consola.
