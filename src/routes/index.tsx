import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login } from "@/lib/auth.functions";
import { useCurrentUser, useInvalidateAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useCurrentUser();
  const invalidateAuth = useInvalidateAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/private" });
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login({ data: { email, password } });
      await invalidateAuth();
      navigate({ to: "/private" });
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="logo"><i className="bi bi-wallet2" /></div>
        <h1>Household Budget</h1>
        <p>Sign in to continue</p>
        <form onSubmit={submit} className="text-start">
          <div className="mb-3">
            <label className="form-label small text-secondary">Email</label>
            <input type="email" required className="form-control" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="mb-3">
            <label className="form-label small text-secondary">Password</label>
            <input type="password" required minLength={8} className="form-control" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <div className="text-danger small mb-2"><i className="bi bi-exclamation-circle me-1" />{error}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary w-100">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="small mt-3 mb-0" style={{ color: "var(--text-dim)" }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
