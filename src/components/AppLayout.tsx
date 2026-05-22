import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { useCurrentUser } from "@/lib/auth";
import { generateRecurringExpenses } from "@/lib/recurring";
import { ensureTemplatesForCurrentMonth } from "@/lib/templates";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, ready } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    generateRecurringExpenses(user.id);
    ensureTemplatesForCurrentMonth(user.id);
  }, [user?.id]);

  if (!ready || !user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
