import { useEffect, useState } from "react";

const KEY = "hb:current_user";

export type CurrentUser = { id: string; name: string };

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCurrentUser(u: CurrentUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(KEY, JSON.stringify(u));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("hb:auth-change"));
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
    const h = () => setUser(getCurrentUser());
    window.addEventListener("hb:auth-change", h);
    return () => window.removeEventListener("hb:auth-change", h);
  }, []);
  return { user, ready };
}
