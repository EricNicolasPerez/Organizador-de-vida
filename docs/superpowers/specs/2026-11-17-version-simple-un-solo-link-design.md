# Organizador — Versión simple: un solo link (v2)

Fecha: 2026-11-17

## Intención y por qué

La v1 (Next.js + Supabase + Vercel) cumple los módulos de Finanzas y Entrenamiento, pero ponerla en marcha exige varias cosas por separado: proyecto en Supabase, migraciones, usuario, claves y Vercel. El usuario quiere **una sola cosa, un solo link**: lo abre en el celular, lo agrega a la pantalla de inicio y funciona. Sin cuentas, sin claves, sin servicios aparte.

Los dos módulos deben quedar **al 100 % de lo que ya hacen** en la v1 (ver spec `2026-11-16-finanzas-entrenamiento-design.md`). Esta v2 no agrega módulos: cambia dónde viven los datos y cómo se publica.

## Objetivos

1. Un link fijo publicado desde el propio repositorio (GitHub Pages). Nada que configurar fuera de GitHub.
2. Sin login. Los datos se guardan en el celular (navegador).
3. Funciona completamente sin señal una vez instalada.
4. Copia de seguridad: botón **Hacer copia** (descarga un archivo `.json` con todo) y **Restaurar** (carga ese archivo, reemplazando lo que hay, con confirmación).
5. Misma funcionalidad que la v1 en Finanzas y Entrenamiento (lista completa abajo).
6. Toda la lógica pura ya probada se reutiliza tal cual: `money`, `finance/balances`, `finance/summary`, `finance/movement-form`, `finance/mappers` (solo `toDecimal`/`toCents` si hacen falta), `training/next-day`, `training/draft-from-day`, `training/set-input`, `dates`.

## Fuera de alcance

- Nube, cuentas, sincronización entre dispositivos y venta (se agregan si algún día se decide vender; la v1 queda guardada en la rama `v1-supabase`).
- Módulos nuevos (hábitos, agenda, estudios, metas).
- Cola de sesiones pendientes de subir: ya no hay servidor. La sesión en curso sigue guardándose mientras se carga.

## Anti-objetivos

- Que haga falta instalar, configurar o crear algo fuera de abrir el link.
- Perder datos al cerrar la app, recargar o quedarse sin señal.
- Perder funciones respecto de la v1.

## Restricciones

- Mobile-first, interfaz en español (voseo), instalable como PWA (manifest + service worker que cachea toda la app).
- Montos en centavos enteros; nunca flotantes para dinero.
- Rutas con hash (`#/finanzas`) para que GitHub Pages sirva una sola página sin configuración de rewrites.
- Se publica con GitHub Actions a la rama de Pages desde `main`. El usuario solo tiene que activar Pages una vez en la configuración del repo (o el workflow lo hace solo si GitHub lo permite).

## Enfoques considerados

1. **Página web estática (Vite + React) publicada en GitHub Pages, datos en el celular** — ELEGIDO. Un solo link, cero cuentas extra, funciona offline. Costo: los datos viven solo en el celular; se mitiga con copia/restauración.
2. Misma app Next.js sin Supabase en Vercel. Un link, pero exige cuenta en Vercel y mantiene estructura pesada. Descartado.
3. Mantener Supabase ocultándolo detrás de un instalador. Sigue siendo "cosas por separado". Descartado.

## Diseño funcional

### Datos
- Un único estado en memoria (`AppData`) con: `accounts`, `categories`, `movements`, `exercises`, `routines` (con días y ejercicios por día), `sessions` (con series), `settings` (última cuenta/categoría usada), `version`.
- Persistido en **IndexedDB** (vía `idb-keyval`), con escritura en cada cambio. localStorage no alcanza por tamaño y por riesgo de borrado.
- `version` en el archivo de copia, para poder migrar formatos en el futuro.
- Ids: `crypto.randomUUID()` (con fallback).
- Categorías por defecto creadas en el primer arranque (misma lista que la v1).

### Pantallas (mismas que la v1)
- **Inicio:** Disponible ARS/USD, Debés en tarjetas, ingresos y gastos del mes, Hoy te toca + Empezar.
- **Finanzas:** resumen del mes por moneda (ingresos, gastos, balance, barras por categoría), navegación entre meses, lista de movimientos filtrable por cuenta, botón "+" siempre visible (gasto / ingreso / transferencia, cuenta y categoría recordadas, transferencia entre monedas con dos montos), editar y borrar movimiento.
- **Cuentas:** crear (nombre, moneda, tipo disponible/tarjeta, saldo inicial; tarjeta siempre ARS y el saldo se carga como deuda), renombrar, archivar, ajustar saldo.
- **Categorías:** listar por tipo, agregar, renombrar, archivar.
- **Entrenamiento:** Hoy te toca (rotación), elegir otro día, entrenamiento libre, historial por fecha.
- **Rutinas:** crear, renombrar, activar, borrar; días: agregar, renombrar, reordenar, borrar; ejercicios por día: elegir de la biblioteca o crear (nombre, medida reps/peso · tiempo · distancia), series/reps/peso objetivo, quitar.
- **Sesión:** parte del día que toca con valores de la última vez; agregar/quitar series y ejercicios; campos que aceptan "22,5"; borrador guardado en cada cambio; al **Terminar** se guarda la sesión y se va al historial de ese día.
- **Historial del día:** sesiones con nombre del día y series.
- **Ajustes:** Hacer copia / Restaurar, y borrar todos los datos (con confirmación).

### Reglas que se mantienen
- Pagar la tarjeta es una transferencia; no cuenta como gasto.
- Un día borrado no borra las sesiones; la sesión guarda el nombre del día.
- "Hoy te toca" vuelve al primer día si el último no existe.
- Solo una rutina activa.

## Decisiones de cómo construirlo (del builder)

- **Vite + React + TypeScript + Tailwind 4**, un solo bundle, `base` configurado para `/Organizador-de-vida/`.
- Estado con un store simple (`useSyncExternalStore`) y persistencia en IndexedDB con `idb-keyval`.
- PWA con `vite-plugin-pwa` (manifest + precache de todo).
- GitHub Actions: en cada push a `main`, build y deploy a GitHub Pages.
- Se eliminan del repo Next.js, Supabase y sus pruebas de base de datos; los módulos puros y sus pruebas se mueven a la nueva estructura sin cambios de lógica.
- La v1 se conserva en la rama `v1-supabase` (creada desde `main` después de integrar el PR #1). La v2 reemplaza el contenido de `main`.
- No hay datos reales que migrar: la v1 nunca llegó a conectarse a Supabase. No se hace exportación v1 → v2.
- El borrador de la sesión en curso vive dentro de `AppData` (IndexedDB), así entra en la copia de seguridad. El módulo `training/session-draft` (localStorage + cola de pendientes) se elimina junto con sus pruebas: ya no hay servidor al que subir.

## Queda en manos del builder

- Estructura exacta de carpetas y nombres de componentes.
- Estilo visual (se mantiene el tema oscuro actual).
- Detalles del workflow de Pages.
