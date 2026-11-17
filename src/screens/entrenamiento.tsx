import { href } from "@/router";
import { useData } from "@/store/store";
import type { AppData } from "@/store/types";
import { nextRoutineDay } from "@/lib/training/next-day";
import { activeRoutine, lastSessionDayId, recentSessions } from "@/store/ops/training";
import { dayLabel } from "@/lib/dates";

export function todayFor(data: AppData) {
  const routine = activeRoutine(data);
  const today = routine ? nextRoutineDay(routine.days, lastSessionDayId(data, routine.id)) : null;
  return { routine, today };
}

export function TodayCard({ data }: { data: AppData }) {
  const { routine, today } = todayFor(data);
  return (
    <div className="card flex flex-col gap-2">
      <p className="label">Hoy te toca</p>
      {today ? (
        <>
          <p className="text-2xl font-bold">{today.name}</p>
          <p className="text-sm text-muted">{routine?.name}</p>
          <a href={href(`/entrenamiento/sesion?dia=${today.id}`)} className="btn-primary mt-1 text-center">Empezar</a>
        </>
      ) : (
        <a href={href("/entrenamiento/rutinas")} className="text-accent">Armá tu rutina de entrenamiento ›</a>
      )}
    </div>
  );
}

export function EntrenamientoScreen() {
  const data = useData();
  const { routine, today } = todayFor(data);
  const recent = recentSessions(data, 60);
  const byDate = new Map<string, typeof recent>();
  for (const s of recent) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  const exerciseName = new Map(data.exercises.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Entrenamiento</h1>
        <a href={href("/entrenamiento/rutinas")} className="text-sm text-accent">Rutinas</a>
      </div>

      {!routine ? (
        <div className="card text-sm">
          <p className="mb-3">Todavía no tenés una rutina activa. Armá una con sus días (Día A, Día B…) y sus ejercicios.</p>
          <a href={href("/entrenamiento/rutinas")} className="btn-primary inline-block">Crear rutina</a>
        </div>
      ) : !today ? (
        <div className="card text-sm">
          <p className="mb-3">Tu rutina <b>{routine.name}</b> no tiene días todavía.</p>
          <a href={href(`/entrenamiento/rutinas/${routine.id}`)} className="btn-primary inline-block">Agregar días</a>
        </div>
      ) : (
        <div className="card flex flex-col gap-3">
          <p className="label">Hoy te toca · {routine.name}</p>
          <p className="text-2xl font-bold">{today.name}</p>
          <p className="text-sm text-muted">{today.exercises.map((e) => exerciseName.get(e.exerciseId) ?? "?").join(" · ") || "Sin ejercicios cargados"}</p>
          {data.draft && <p className="text-sm text-accent">Tenés una sesión sin terminar.</p>}
          <a href={href(`/entrenamiento/sesion?dia=${today.id}`)} className="btn-primary text-center">{data.draft ? "Continuar" : "Empezar"}</a>
          {routine.days.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-accent">Hacer otro día</summary>
              <ul className="mt-2 flex flex-wrap gap-2">
                {routine.days.filter((d) => d.id !== today.id).map((d) => (
                  <li key={d.id}><a href={href(`/entrenamiento/sesion?dia=${d.id}`)} className="btn-ghost inline-block py-2">{d.name}</a></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <a href={href("/entrenamiento/sesion")} className="text-center text-sm text-accent">Entrenamiento libre (sin rutina)</a>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Historial</h2>
        {recent.length === 0 && <p className="text-sm text-muted">Acá vas a ver qué hiciste cada día.</p>}
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
          {[...byDate].map(([date, sessions]) => (
            <li key={date}>
              <a href={href(`/entrenamiento/historial/${date}`)} className="flex items-center justify-between px-4 py-3">
                <span className="capitalize">{dayLabel(date)}</span>
                <span className="text-sm text-muted">{sessions.map((s) => s.dayName ?? "Libre").join(", ")}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
