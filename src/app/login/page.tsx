"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null });
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-3xl font-bold">Organizador</h1>
      <p className="mb-8 text-sm text-muted">Toda tu vida, un solo sistema.</p>
      <form action={action} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className="input" />
        <input name="password" type="password" required placeholder="Contraseña" autoComplete="current-password" className="input" />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
