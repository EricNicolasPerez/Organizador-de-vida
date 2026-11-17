import { useEffect, useState } from "react";
import { href, matchRoute, useHashRoute } from "./router";
import { initStore, useData } from "./store/store";
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
  return <p className="text-muted">Página no encontrada. <a href={href("/")} className="text-accent">Ir al inicio</a></p>;
}

export function App() {
  const [ready, setReady] = useState(false);
  const route = useHashRoute();
  const { accounts, categories } = useData();

  useEffect(() => {
    initStore().finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="p-6 text-muted">Cargando…</main>;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <a href={href("/")} className="text-lg font-bold">Organizador</a>
        <a href={href("/ajustes")} className="text-sm text-muted">Ajustes</a>
      </header>
      <Screen path={route.path} query={route.query} />
      <QuickAdd accounts={accounts} categories={categories} />
      <BottomNav path={route.path} />
    </div>
  );
}
