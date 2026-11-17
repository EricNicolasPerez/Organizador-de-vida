import { href } from "@/router";

const ITEMS = [
  { to: "/", label: "Inicio", icon: "◉" },
  { to: "/finanzas", label: "Finanzas", icon: "$" },
  { to: "/entrenamiento", label: "Entrenamiento", icon: "↑" },
];

export function BottomNav({ path }: { path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          return (
            <li key={item.to} className="flex-1">
              <a href={href(item.to)} className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-accent" : "text-muted"}`}>
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
