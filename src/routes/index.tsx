import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Login });

type U = { id: string; name: string };

function Login() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getCurrentUser()) { navigate({ to: "/private" }); return; }
    supabase.from("users").select("id, name").order("name").then(({ data }) => {
      setUsers((data ?? []) as U[]);
      setLoading(false);
    });
  }, [navigate]);

  const pick = (u: U) => { setCurrentUser(u); navigate({ to: "/private" }); };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="logo"><i className="bi bi-wallet2" /></div>
        <h1>Household Budget</h1>
        <p>Pick your name to continue</p>
        {loading ? (
          <div className="text-secondary small">Loading…</div>
        ) : (
          <div className="login-options">
            {users.map((u) => (
              <button key={u.id} className="login-option" onClick={() => pick(u)}>
                <span className="avatar">{u.name[0]}</span>
                <span>{u.name}</span>
                <i className="bi bi-arrow-right ms-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
