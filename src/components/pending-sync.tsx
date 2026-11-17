"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserStore, dismissFailed, flushPending, listFailed, listPending } from "@/lib/training/session-draft";
import { isPermanentUploadError, uploadSession } from "@/app/(app)/entrenamiento/sesion/session-logger";

/** Uploads sessions saved offline when the app opens or the connection comes back. */
export function PendingSync() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<{ clientId: string; date: string }[]>([]);

  useEffect(() => {
    let running = false;
    const sync = async () => {
      if (running) return;
      running = true;
      const store = browserStore();
      if (listPending(store).length > 0) {
        const { uploaded } = await flushPending(store, uploadSession, isPermanentUploadError);
        if (uploaded > 0) router.refresh();
      }
      setPending(listPending(store).length);
      setFailed(listFailed(store).map((d) => ({ clientId: d.clientId, date: d.date })));
      running = false;
    };
    sync();
    window.addEventListener("online", sync);
    const timer = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("online", sync);
      window.clearInterval(timer);
    };
  }, [router]);

  if (pending === 0 && failed.length === 0) return null;
  return (
    <div className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 flex-col items-center gap-1">
      {pending > 0 && (
        <div className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted shadow">
          {pending} {pending === 1 ? "sesión sin subir" : "sesiones sin subir"}
        </div>
      )}
      {failed.map((f) => (
        <div key={f.clientId} className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs text-danger shadow">
          No se pudo subir la sesión del {f.date}
          <button
            className="text-muted underline"
            onClick={() => {
              dismissFailed(browserStore(), f.clientId);
              setFailed((list) => list.filter((x) => x.clientId !== f.clientId));
            }}
          >
            Descartar
          </button>
        </div>
      ))}
    </div>
  );
}
