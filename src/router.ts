import { useSyncExternalStore } from "react";

export interface Route {
  path: string;
  query: Record<string, string>;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [p, q = ""] = raw.split("?");
  const path = p && p !== "/" ? (p.startsWith("/") ? p : "/" + p) : "/";
  const query: Record<string, string> = {};
  new URLSearchParams(q).forEach((v, k) => { query[k] = v; });
  return { path: path.length > 1 ? path.replace(/\/+$/, "") : path, query };
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  return parseHash(hash);
}

export function navigate(to: string, replace = false) {
  const target = "#" + (to.startsWith("/") ? to : "/" + to);
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}

export function href(to: string): string {
  return "#" + (to.startsWith("/") ? to : "/" + to);
}
