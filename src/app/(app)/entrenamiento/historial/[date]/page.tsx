import Link from "next/link";
import { getSessionsOn } from "@/lib/training/queries";
import { dayLabel } from "@/lib/dates";
import type { SessionSetRow } from "@/lib/training/queries";

function formatSet(r: SessionSetRow): string {
  const s = r.set;
  if (r.measure === "time") return s.durationSec != null ? `${s.durationSec} s` : "—";
  if (r.measure === "distance") return s.distanceM != null ? `${s.distanceM} m` : "—";
  return `${s.reps ?? "—"} × ${s.weightKg != null ? `${s.weightKg} kg` : "—"}`;
}

export default async function HistorialPage({ params }: PageProps<"/entrenamiento/historial/[date]">) {
  const { date } = await params;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const sessions = valid ? await getSessionsOn(date) : [];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/entrenamiento" className="text-sm text-accent">‹ Entrenamiento</Link>
      <h1 className="text-2xl font-bold capitalize">{valid ? dayLabel(date) : "Fecha inválida"}</h1>
      {sessions.length === 0 && <p className="text-muted">No entrenaste este día.</p>}
      {sessions.map((s) => {
        const groups: { name: string; rows: SessionSetRow[] }[] = [];
        for (const r of s.sets) {
          const g = groups.at(-1);
          if (g && g.rows[0].position === r.position) g.rows.push(r);
          else groups.push({ name: r.exerciseName, rows: [r] });
        }
        return (
          <section key={s.id} className="card flex flex-col gap-3">
            <h2 className="font-semibold">{s.dayName ?? "Entrenamiento libre"}</h2>
            {groups.map((g, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{g.name}</p>
                <p className="text-sm text-muted tabular-nums">{g.rows.map(formatSet).join(" · ")}</p>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
