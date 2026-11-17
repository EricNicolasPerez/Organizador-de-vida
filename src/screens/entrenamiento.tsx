import { href } from "@/router";
import type { AppData } from "@/store/types";

/** Placeholder until the training module screens land (Task 6). */
export function TodayCard({ data }: { data: AppData }) {
  void data;
  return (
    <div className="card flex flex-col gap-2">
      <p className="label">Hoy te toca</p>
      <a href={href("/entrenamiento/rutinas")} className="text-accent">Armá tu rutina de entrenamiento ›</a>
    </div>
  );
}

export function EntrenamientoScreen() {
  return <h1 className="text-2xl font-bold">Entrenamiento</h1>;
}
