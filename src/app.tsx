import { useEffect, useState } from "react";
import { href, matchRoute, useHashRoute } from "./router";
import { clearConflict, initStore, useData, useStatus } from "./store/store";
import { BottomNav } from "./components/bottom-nav";
import { QuickAdd } from "./components/quick-add";
import { HomeScreen } from "./screens/home";
import { FinanzasScreen } from "./screens/finanzas";
import { CuentasScreen } from "./screens/cuentas";
import { CategoriasScreen } from "./screens/categorias";
import { MovimientoScreen } from "./screens/movimiento";
import { EntrenamientoScreen } from "./screens/entrenamiento";
import { RutinasScreen } from "./screens/rutinas";
import { RutinaScreen } from "./screens/rutina";
import { SesionScreen } from "./screens/sesion";
import { HistorialScreen } from "./screens/historial";
import { AjustesScreen } from "./screens/ajustes";

function Screen({ path, query }: { path: string; query: Record<string, string> }) {
  let p: Record<string, string> | null;
  if (path === "/") return <HomeScreen />;
  if (path === "/finanzas") return <FinanzasScreen query={query} />;
  if (path === "/finanzas/cuentas") return <CuentasScreen />;
  if (path === "/finanzas/categorias") return <CategoriasScreen />;
  if ((p = matchRoute("/finanzas/movimiento/:id", path))) return <MovimientoScreen id={p.id} />;
  if (path === "/entrenamiento") return <EntrenamientoScreen />;
  if (path === "/entrenamiento/rutinas") return <RutinasScreen />;
  if ((p = matchRoute("/entrenamiento/rutinas/:id", path))) return <RutinaScreen id={p.id} />;
  if (path === "/entrenamiento/sesion") return <SesionScreen query={query} />;
  if ((p = matchRoute("/entrenamiento/historial/:date", path))) return <HistorialScreen date={p.date} />;
  if (path === "/ajustes") return <AjustesScreen />;
  return <p className="text-muted">Página no encontrada. <a href={href("/")} className="text-accent">Ir al inicio</a></p>;
}

export function App() {
  const [ready, setReady] = useState(false);
  const route = useHashRoute();
  const { accounts, categories } = useData();
  const status = useStatus();

  useEffect(() => {
    initStore().finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="p-6 text-muted">Cargando…</main>;
  if (status.loadFailed) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="mb-2 text-xl font-bold">No se pudo abrir el almacenamiento</h1>
        <p className="text-sm text-muted">El navegador no permite guardar datos (modo privado o sin espacio). Salí del modo privado o liberá espacio y volvé a abrir la app.</p>
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <a href={href("/")} className="text-lg font-bold">Organizador</a>
        <a href={href("/ajustes")} className="text-sm text-muted">Ajustes</a>
      </header>
      {status.saveFailed && (
        <p role="alert" className="mb-3 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm">
          No se pudo guardar el último cambio. Revisá el espacio del dispositivo e intentá de nuevo.
        </p>
      )}
      {status.conflict && (
        <p role="alert" className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm">
          <span>Había cambios más nuevos hechos desde otra pestaña: los cargamos y tu último cambio no se guardó. Volvé a hacerlo.</span>
          <button type="button" className="text-accent" onClick={clearConflict}>Ok</button>
        </p>
      )}
      <Screen path={route.path} query={route.query} />
      <QuickAdd accounts={accounts} categories={categories} />
      <BottomNav path={route.path} />
    </div>
  );
}
