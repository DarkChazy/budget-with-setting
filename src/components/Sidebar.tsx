import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCurrentUser, useInvalidateAuth } from "@/lib/auth";
import { Modal } from "./Modal";
import { InlineNumber } from "./InlineNumber";
import { addSavings, deleteSavings, listSavings, logout as logoutFn, updateSavingsAmount } from "@/lib/api.functions";

type Savings = { id: string; name: string; amount: number | string };

const NAV = [
  { to: "/private", label: "Private Account", icon: "bi-person" },
  { to: "/house", label: "House Account", icon: "bi-house" },
  { to: "/credit-card", label: "Credit Card", icon: "bi-credit-card-2-front" },
  { to: "/settings", label: "Settings", icon: "bi-gear" },
];

export function Sidebar() {
  const { user } = useCurrentUser();
  const invalidateAuth = useInvalidateAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [savings, setSavings] = useState<Savings[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmt, setNewAmt] = useState("0");

  const load = async () => {
    if (!user) return;
    const data = await listSavings();
    setSavings(data as any);
  };
  useEffect(() => { load(); }, [user?.id]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("hb:savings-change", h);
    return () => window.removeEventListener("hb:savings-change", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onAddSavings = async () => {
    if (!user || !newName.trim()) return;
    await addSavings({ data: { name: newName.trim(), amount: parseFloat(newAmt) || 0 } });
    setNewName(""); setNewAmt("0"); setAddOpen(false);
    window.dispatchEvent(new Event("hb:savings-change"));
  };

  const updateAmt = async (id: string, amt: number) => {
    await updateSavingsAmount({ data: { id, amount: amt } });
    setSavings((s) => s.map((x) => x.id === id ? { ...x, amount: amt } : x));
    window.dispatchEvent(new Event("hb:savings-change"));
  };

  const removeSavings = async (id: string) => {
    await deleteSavings({ data: { id } });
    window.dispatchEvent(new Event("hb:savings-change"));
  };

  const logout = async () => {
    await logoutFn();
    await invalidateAuth();
    navigate({ to: "/" });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <i className="bi bi-wallet2" />
        <div>
          <div>Budget</div>
          <div style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 400 }}>
            Hi, {user?.name}
          </div>
        </div>
      </div>

      <nav>
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={"nav-link" + (loc.pathname === n.to ? " active" : "")}
          >
            <i className={"bi " + n.icon} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-section-title">
        <span>Savings</span>
        <button onClick={() => setAddOpen(true)} title="Add savings account">
          <i className="bi bi-plus-lg" />
        </button>
      </div>
      <div>
        {savings.length === 0 && (
          <div style={{ color: "var(--text-dim)", fontSize: ".8rem", padding: ".5rem .75rem" }}>
            No savings yet
          </div>
        )}
        {savings.map((s) => (
          <div key={s.id} className="savings-item">
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </span>
            <InlineNumber
              value={parseFloat(s.amount as any)}
              onSave={(n) => updateAmt(s.id, n)}
              className="amount editable"
              prefix="€"
            />
            <button
              onClick={() => removeSavings(s.id)}
              style={{ background: "transparent", border: "none", color: "var(--text-dim)", marginLeft: 4 }}
              title="Remove"
            >
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
        <button onClick={logout} className="nav-link" style={{ width: "100%", background: "transparent", border: "none" }}>
          <i className="bi bi-box-arrow-right" />
          <span>Logout</span>
        </button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add savings account" maxWidth={400}>
        <div className="mb-3">
          <label className="form-label small text-secondary">Name</label>
          <input autoFocus className="form-control" value={newName}
            onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Vacation fund" />
        </div>
        <div>
          <label className="form-label small text-secondary">Amount</label>
          <input type="number" step="0.01" className="form-control" value={newAmt}
            onChange={(e) => setNewAmt(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={onAddSavings}>Add</button>
        </div>
      </Modal>
    </aside>
  );
}
