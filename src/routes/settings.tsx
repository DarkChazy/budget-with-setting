import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useCurrentUser } from "@/lib/auth";
import {
  ensureUserSettings, ensureSeedCategories,
  notifySettingsChanged, notifyCategoriesChanged,
  useCategories,
  type UserSettings,
} from "@/lib/settings";
import {
  ensureTemplatesForCurrentMonth, notifyTemplatesChanged, notifySavingsChanged,
} from "@/lib/templates";
import { fmtMoney } from "@/lib/format";
import { InlineNumber } from "@/components/InlineNumber";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal } from "@/components/Modal";

export const Route = createFileRoute("/settings")({
  component: () => <AppLayout><SettingsPage /></AppLayout>,
});

type TabKey = "general" | "templates" | "house" | "categories" | "savings";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "general",    label: "General",            icon: "bi-sliders" },
  { key: "templates",  label: "Monthly Templates",  icon: "bi-arrow-repeat" },
  { key: "house",      label: "House Defaults",     icon: "bi-house-gear" },
  { key: "categories", label: "Categories",         icon: "bi-tag" },
  { key: "savings",    label: "Savings Accounts",   icon: "bi-piggy-bank" },
];

function SettingsPage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<TabKey>("general");

  if (!user) return null;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure defaults and preferences — all changes save automatically</p>
      </div>

      <ul className="nav nav-pills mb-4 settings-tabs" role="tablist">
        {TABS.map((t) => (
          <li key={t.key} className="nav-item">
            <button
              type="button"
              className={"nav-link" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              <i className={"bi " + t.icon + " me-2"} />
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "general"    && <GeneralTab    userId={user.id} />}
      {tab === "templates"  && <TemplatesTab  userId={user.id} />}
      {tab === "house"      && <HouseTab      userId={user.id} />}
      {tab === "categories" && <CategoriesTab userId={user.id} />}
      {tab === "savings"    && <SavingsTab    userId={user.id} />}
    </>
  );
}

/* ============ shared hook for saved-pill feedback ============ */
function useSavedPing() {
  const [savedAt, setSavedAt] = useState(0);
  const ping = () => setSavedAt(Date.now());
  const visible = savedAt > 0 && Date.now() - savedAt < 1500;
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(0), 1600);
    return () => clearTimeout(t);
  }, [savedAt]);
  return { ping, visible };
}

function SavedPill({ visible }: { visible: boolean }) {
  return (
    <span
      className="small ms-2"
      style={{
        color: "var(--accent-2)",
        opacity: visible ? 1 : 0,
        transition: "opacity .25s",
      }}
    >
      <i className="bi bi-check2-circle me-1" />Saved
    </span>
  );
}

/* ============ Tab 1: General ============ */
const MONTH_OFFSETS = [
  { value: -1, label: "Previous month" },
  { value: 0,  label: "Current month" },
  { value: 1,  label: "Next month" },
];

function GeneralTab({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const { ping, visible } = useSavedPing();

  useEffect(() => { ensureUserSettings(userId).then(setSettings); }, [userId]);

  const update = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("user_settings").update(patch).eq("user_id", userId);
    notifySettingsChanged();
    ping();
  };

  if (!settings) return null;

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <div className="card-modern h-100">
          <h2 className="h5 mb-1">Currency</h2>
          <div className="subtitle mb-3">Used everywhere in the app</div>
          <div className="d-flex align-items-center justify-content-between p-3 rounded"
               style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div>
              <div className="fw-semibold" style={{ fontSize: "1.1rem" }}>€ Euro</div>
              <div className="small" style={{ color: "var(--text-dim)" }}>European formatting · max 2 decimals</div>
            </div>
            <span className="badge text-bg-secondary"><i className="bi bi-lock-fill me-1" />Locked</span>
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card-modern h-100">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <h2 className="h5 mb-0">Month defaults <SavedPill visible={visible} /></h2>
          </div>
          <div className="subtitle mb-3">Which month new expenses default to. Only affects future expenses.</div>

          <label className="form-label small text-secondary">Default Personal Account Month</label>
          <select
            className="form-select mb-3"
            value={settings.default_private_month_offset}
            onChange={(e) => update({ default_private_month_offset: parseInt(e.target.value) })}
          >
            {MONTH_OFFSETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label className="form-label small text-secondary">Default House Account Month</label>
          <select
            className="form-select"
            value={settings.default_house_month_offset}
            onChange={(e) => update({ default_house_month_offset: parseInt(e.target.value) })}
          >
            {MONTH_OFFSETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ============ Tab 2: House Defaults ============ */
function HouseTab({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [cz, setCz] = useState(60);
  const [he, setHe] = useState(40);
  const { ping, visible } = useSavedPing();

  useEffect(() => {
    ensureUserSettings(userId).then((s) => {
      setSettings(s);
      setCz(parseFloat(s.chazy_default_percentage as any));
      setHe(parseFloat(s.helly_default_percentage as any));
    });
  }, [userId]);

  const total = Math.round((cz + he) * 100) / 100;
  const invalid = total !== 100;

  const saveIfValid = useCallback(async (nextCz: number, nextHe: number) => {
    const t = Math.round((nextCz + nextHe) * 100) / 100;
    if (t !== 100) return;
    if (!settings) return;
    setSettings({ ...settings, chazy_default_percentage: nextCz, helly_default_percentage: nextHe });
    await supabase.from("user_settings").update({
      chazy_default_percentage: nextCz,
      helly_default_percentage: nextHe,
    }).eq("user_id", userId);
    notifySettingsChanged();
    ping();
  }, [settings, userId]);

  const onCz = (v: number) => {
    const safe = isNaN(v) ? 0 : v;
    setCz(safe);
    const auto = Math.max(0, Math.round((100 - safe) * 100) / 100);
    setHe(auto);
    saveIfValid(safe, auto);
  };
  const onHe = (v: number) => {
    const safe = isNaN(v) ? 0 : v;
    setHe(safe);
    const auto = Math.max(0, Math.round((100 - safe) * 100) / 100);
    setCz(auto);
    saveIfValid(auto, safe);
  };

  if (!settings) return null;

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card-modern">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <h2 className="h5 mb-0">Default split for House expenses <SavedPill visible={visible} /></h2>
            <span className={"small fw-semibold " + (invalid ? "text-danger" : "text-success")}>
              Total: {total}%
            </span>
          </div>
          <div className="subtitle mb-3">
            Prefilled when creating new House Account expenses. You can still override per expense. Only affects future expenses.
          </div>

          <div className="row g-3">
            <div className="col-6">
              <label className="form-label small text-secondary">Chazy default %</label>
              <div className="input-group">
                <input
                  type="number" step="0.01" min="0" max="100"
                  className={"form-control" + (invalid ? " is-invalid" : "")}
                  value={cz}
                  onChange={(e) => onCz(parseFloat(e.target.value))}
                />
                <span className="input-group-text">%</span>
              </div>
            </div>
            <div className="col-6">
              <label className="form-label small text-secondary">Helly default %</label>
              <div className="input-group">
                <input
                  type="number" step="0.01" min="0" max="100"
                  className={"form-control" + (invalid ? " is-invalid" : "")}
                  value={he}
                  onChange={(e) => onHe(parseFloat(e.target.value))}
                />
                <span className="input-group-text">%</span>
              </div>
            </div>
          </div>

          {invalid && (
            <div className="text-danger small mt-3">
              <i className="bi bi-exclamation-circle me-1" />
              The combined percentage for Chazy and Helly must equal 100%.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Tab 3: Categories ============ */
type Category = { id: string; name: string };

function CategoriesTab({ userId }: { userId: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    await ensureSeedCategories(userId);
    const { data } = await supabase
      .from("categories").select("id,name").eq("user_id", userId).order("name");
    setCats((data ?? []) as any);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError("That category already exists.");
      return;
    }
    setError("");
    await supabase.from("categories").insert({ user_id: userId, name });
    setNewName("");
    notifyCategoriesChanged();
    load();
  };

  const startEdit = (c: Category) => { setEditingId(c.id); setEditingName(c.name); };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!editingId || !name) { setEditingId(null); return; }
    await supabase.from("categories").update({ name }).eq("id", editingId);
    setEditingId(null);
    notifyCategoriesChanged();
    load();
  };

  const remove = async (c: Category) => {
    await supabase.from("categories").delete().eq("id", c.id);
    setPendingDelete(null);
    notifyCategoriesChanged();
    load();
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card-modern">
          <h2 className="h5 mb-1">Expense categories</h2>
          <div className="subtitle mb-3">
            Deleting a category keeps it on past expenses — it just disappears from future dropdowns.
          </div>

          <div className="d-flex gap-2 mb-3">
            <input
              className="form-control"
              placeholder="New category name…"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            />
            <button className="btn btn-primary" onClick={add} disabled={!newName.trim()}>
              <i className="bi bi-plus-lg me-1" />Add
            </button>
          </div>
          {error && <div className="text-danger small mb-2"><i className="bi bi-exclamation-circle me-1" />{error}</div>}

          <div className="settings-list">
            {cats.length === 0 && (
              <div className="text-center p-4" style={{ color: "var(--text-dim)" }}>
                No categories yet
              </div>
            )}
            {cats.map((c) => (
              <div key={c.id} className="settings-row">
                {editingId === c.id ? (
                  <input
                    autoFocus
                    className="form-control"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <>
                    <span className="flex-grow-1">
                      <i className="bi bi-tag-fill me-2" style={{ color: "var(--text-dim)" }} />
                      {c.name}
                    </span>
                    <button className="btn btn-sm btn-ghost" onClick={() => startEdit(c)} title="Rename">
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setPendingDelete(c)} title="Delete">
                      <i className="bi bi-trash" style={{ color: "var(--danger)" }} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Delete category"
        message={`Delete "${pendingDelete?.name}"? Past expenses keep this category — it just disappears from future dropdowns.`}
      />
    </div>
  );
}

/* ============ Tab 4: Savings Accounts ============ */
type Savings = { id: string; name: string; amount: number | string };

function SavingsTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<Savings[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmt, setNewAmt] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Savings | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("savings_accounts").select("*").eq("user_id", userId).order("created_at");
    setItems((data ?? []) as any);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    await supabase.from("savings_accounts").insert({
      user_id: userId, name: newName.trim(), amount: parseFloat(newAmt) || 0,
    });
    setNewName(""); setNewAmt("0"); setAddOpen(false);
    load();
  };

  const updateAmount = async (id: string, amount: number) => {
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, amount } : x));
    await supabase.from("savings_accounts").update({ amount }).eq("id", id);
  };

  const saveName = async () => {
    const name = editingName.trim();
    if (!editingId || !name) { setEditingId(null); return; }
    await supabase.from("savings_accounts").update({ name }).eq("id", editingId);
    setEditingId(null);
    load();
  };

  const remove = async (s: Savings) => {
    await supabase.from("savings_accounts").delete().eq("id", s.id);
    setPendingDelete(null);
    load();
  };

  return (
    <>
      <div className="card-modern">
        <div className="section-header">
          <div>
            <h2 className="h5 mb-0">Savings accounts</h2>
            <div className="subtitle">Informational only — track balances in one place</div>
          </div>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <i className="bi bi-plus-lg me-1" />Add savings account
          </button>
        </div>

        <div className="row g-3 mt-1">
          {items.length === 0 && (
            <div className="col-12 text-center p-4" style={{ color: "var(--text-dim)" }}>
              No savings accounts yet
            </div>
          )}
          {items.map((s) => (
            <div key={s.id} className="col-md-6 col-lg-4">
              <div className="card-modern h-100" style={{ padding: "1rem" }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      className="form-control form-control-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="fw-semibold text-start flex-grow-1"
                      style={{ background: "transparent", border: "none", color: "var(--text)", padding: 0 }}
                      onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                      title="Click to rename"
                    >
                      <i className="bi bi-piggy-bank me-2" style={{ color: "var(--accent-2)" }} />
                      {s.name}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setPendingDelete(s)}
                    title="Delete"
                  >
                    <i className="bi bi-trash" style={{ color: "var(--danger)" }} />
                  </button>
                </div>
                <div className="summary-label">Balance</div>
                <InlineNumber
                  value={parseFloat(s.amount as any)}
                  onSave={(n) => updateAmount(s.id, n)}
                  className="summary-amount editable"
                  prefix="€"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add savings account" maxWidth={420}>
        <div className="mb-3">
          <label className="form-label small text-secondary">Name</label>
          <input autoFocus className="form-control" value={newName}
            onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Vacation fund" />
        </div>
        <div>
          <label className="form-label small text-secondary">Amount (€)</label>
          <input type="number" step="0.01" className="form-control" value={newAmt}
            onChange={(e) => setNewAmt(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={add} disabled={!newName.trim()}>Add</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Delete savings account"
        message={`Delete "${pendingDelete?.name}"? This cannot be undone.`}
      />
    </>
  );
}