import { href } from "@/router";
import { useData } from "@/store/store";
import { sessionsOn } from "@/store/ops/training";
import { dayLabel } from "@/lib/dates";
import type { DraftExercise } from "@/lib/training/types";
import { formatSetValue } from "@/lib/training/set-input";

function formatSets(e: DraftExercise): string {
  return e.sets.map((s) => {
    if (e.measure === "time") return s.durationSec != null ? `${s.durationSec} s` : "—";
    if (e.measure === "distance") return s.distanceM != null ? `${formatSetValue(s.distanceM)} m` : "—";
    return `${s.reps ?? "—"} × ${s.weightKg != null ? `${formatSetValue(s.weightKg)} kg` : "—"}`;
  }).join(" · ");
}

export function HistorialScreen({ date }: { date: string }) {
  const data = useData();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const sessions = valid ? sessionsOn(data, date) : [];
  return (
    <div className="flex flex-col gap-4">
      <a href={href("/entrenamiento")} className="text-sm text-accent">‹ Entrenamiento</a>
      <h1 className="text-2xl font-bold capitalize">{valid ? dayLabel(date) : "Fecha inválida"}</h1>
      {sessions.length === 0 && <p className="text-muted">No entrenaste este día.</p>}
      {sessions.map((s) => (
        <section key={s.id} className="card flex flex-col gap-3">
          <h2 className="font-semibold">{s.dayName ?? "Entrenamiento libre"}</h2>
          {s.exercises.map((e, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{e.name}</p>
              <p className="text-sm text-muted tabular-nums">{formatSets(e)}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
