import { useRef, useState } from "react";
import { href } from "@/router";
import { getData, replaceAll, update, useData } from "@/store/store";
import { backupFileName, parseBackup, serializeBackup } from "@/store/backup";
import { emptyData } from "@/store/seed";
import { importRoutines, parseRoutineFile } from "@/store/routine-import";
import pkg from "../../package.json";

export function AjustesScreen() {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const routinesRef = useRef<HTMLInputElement>(null);
  const [routinesMsg, setRoutinesMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function addRoutinesFrom(file: File) {
    const parsed = parseRoutineFile(await file.text());
    if (!parsed.ok) { setRoutinesMsg({ ok: false, text: parsed.error }); return; }
    const names = parsed.routines.map((r) => r.name).join(", ");
    if (!confirm(`Se van a agregar: ${names}. No se borra nada de lo que ya tenés. ¿Continuar?`)) return;
    update((d) => importRoutines(d, parsed.routines));
    setRoutinesMsg({ ok: true, text: `Rutinas agregadas: ${names}. Las ves en Entrenamiento → Rutinas.` });
  }
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function download() {
    const blob = new Blob([serializeBackup(getData())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName(new Date());
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: "Copia descargada. Guardala en un lugar seguro." });
  }

  async function restore(file: File) {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { setMsg({ ok: false, text: parsed.error }); return; }
    if (!confirm("Esto reemplaza todos los datos actuales por los de la copia. ¿Continuar?")) return;
    replaceAll(parsed.data);
    setMsg({ ok: true, text: "Datos restaurados." });
  }

  function erase() {
    if (!confirm("Esto borra TODOS los datos de este dispositivo. ¿Continuar?")) return;
    if (!confirm("¿Seguro? No se puede deshacer (salvo que tengas una copia).")) return;
    replaceAll(emptyData());
    setMsg({ ok: true, text: "Datos borrados." });
  }

  const counts = `${data.movements.length} movimientos · ${data.sessions.length} sesiones`;

  return (
    <div className="flex flex-col gap-4">
      <a href={href("/")} className="text-sm text-accent">‹ Inicio</a>
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Copia de seguridad</h2>
        <p className="text-sm text-muted">Tus datos se guardan solo en este dispositivo ({counts}). Hacé una copia cada tanto para no perderlos.</p>
        <button type="button" className="btn-primary" onClick={download}>Hacer copia</button>
        <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>Restaurar desde una copia</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de copia"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ""; }} />
        {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Rutinas</h2>
        <p className="text-sm text-muted">Agregá rutinas desde un archivo de rutinas. No borra ni cambia nada de lo que ya tenés.</p>
        <button type="button" className="btn-ghost" onClick={() => routinesRef.current?.click()}>Agregar rutinas desde un archivo</button>
        <input ref={routinesRef} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de rutinas"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void addRoutinesFrom(f); e.target.value = ""; }} />
        {routinesMsg && <p className={`text-sm ${routinesMsg.ok ? "text-success" : "text-danger"}`}>{routinesMsg.text}</p>}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Zona peligrosa</h2>
        <button type="button" className="btn-ghost text-danger" onClick={erase}>Borrar todos los datos</button>
      </section>

      <p className="text-center text-xs text-muted">Organizador v{pkg.version}</p>
    </div>
  );
}
