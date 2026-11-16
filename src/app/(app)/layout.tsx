import { BottomNav } from "./bottom-nav";
import { signOut } from "../login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold">Organizador</span>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted">Salir</button>
        </form>
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
