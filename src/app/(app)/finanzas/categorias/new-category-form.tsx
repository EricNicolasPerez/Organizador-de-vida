"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type FormState } from "../actions";

export function NewCategoryForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCategory, { error: null });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="name" placeholder="Nombre" required className="input" />
        <select name="kind" defaultValue="expense" className="input w-36" aria-label="Tipo">
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-primary">Agregar</button>
    </form>
  );
}
