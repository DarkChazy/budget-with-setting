import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { register } from "@/lib/auth.functions";
import { useInvalidateAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const invalidateAuth = useInvalidateAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await register({ data: { name, email, password } });
      await invalidateAuth();
      navigate({ to: "/private" });
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="logo"><i className="bi bi-wallet2" /></div>
        <h1>Create account</h1>
        <p>Start tracking your household budget</p>
        <form onSubmit={submit} className="text-start">
          <div className="mb-3">
            <label className="form-label small text-secondary">Name</label>
            <input required maxLength={64} className="form-control" value={name}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label small text-secondary">Email</label>
            <input type="email" required className="form-control" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="mb-3">
            <label className="form-label small text-secondary">Password</label>
            <input type="password" required minLength={8} className="form-control" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <div className="form-text small">Minimum 8 characters.</div>
          </div>
          {error && <div className="text-danger small mb-2"><i className="bi bi-exclamation-circle me-1" />{error}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary w-100">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="small mt-3 mb-0" style={{ color: "var(--text-dim)" }}>
          Have an account? <Link to="/">Sign in</Link>
        </p>
      </div>
    </div>
  );
}