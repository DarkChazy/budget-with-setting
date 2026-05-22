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
function GeneralTab({ userId: _userId }: { userId: string }) {
  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card-modern">
          <h2 className="h5 mb-1">General preferences</h2>
          <div className="subtitle mb-3">Lightweight global settings</div>

          <div className="d-flex align-items-center justify-content-between p-3 rounded mb-2"
               style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div>
              <div className="fw-semibold">Theme</div>
              <div className="small" style={{ color: "var(--text-dim)" }}>
                Follows your system preference automatically
              </div>
            </div>
            <span className="badge text-bg-secondary">
              <i className="bi bi-circle-half me-1" />System
            </span>
          </div>

          <div className="small" style={{ color: "var(--text-dim)" }}>
            <i className="bi bi-info-circle me-1" />
            Recurring monthly expenses are now managed in <strong>Monthly Templates</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Tab: Monthly Templates ============ */
type Template = {
  id: string;
  user_id: string;
  account_type: "private" | "house";
  name: string;
  amount: number | string;
  category: string | null;
  notes: string | null;
  default_paid: boolean;
  chazy_percentage: number | string;
  helly_percentage: number | string;
  active: boolean;
};

type TemplateDraft = {
  id?: string;
  name: string;
  amount: number;
  category: string;
  notes: string;
  default_paid: boolean;
  chazy_percentage: number;
  helly_percentage: number;
};

function TemplatesTab({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const { categories } = useCategories(userId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAccount, setModalAccount] = useState<"private" | "house">("private");
  const [editing, setEditing] = useState<TemplateDraft | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("monthly_templates").select("*").eq("user_id", userId).order("created_at");
    setTemplates((data ?? []) as any);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = (account: "private" | "house") => {
    setModalAccount(account);
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setModalAccount(t.account_type);
    setEditing({
      id: t.id,
      name: t.name,
      amount: parseFloat(t.amount as any),
      category: t.category ?? "",
      notes: t.notes ?? "",
      default_paid: t.default_paid,
      chazy_percentage: parseFloat(t.chazy_percentage as any),
      helly_percentage: parseFloat(t.helly_percentage as any),
    });
    setModalOpen(true);
  };

  const save = async (draft: TemplateDraft) => {
    const payload: any = {
      name: draft.name.trim(),
      amount: draft.amount,
      category: draft.category || null,
      notes: draft.notes || null,
      default_paid: draft.default_paid,
      chazy_percentage: draft.chazy_percentage,
      helly_percentage: draft.helly_percentage,
    };
    if (draft.id) {
      await supabase.from("monthly_templates").update(payload).eq("id", draft.id);
    } else {
      await supabase.from("monthly_templates").insert({
        ...payload, user_id: userId, account_type: modalAccount, active: true,
      });
    }
    setModalOpen(false);
    await load();
    // Materialize current-month expense from any newly added template
    await ensureTemplatesForCurrentMonth(userId);
    notifyTemplatesChanged();
  };

  const remove = async (t: Template) => {
    await supabase.from("monthly_templates").delete().eq("id", t.id);
    setPendingDelete(null);
    await load();
    notifyTemplatesChanged();
  };

  const privateT = useMemo(() => templates.filter((t) => t.account_type === "private"), [templates]);
  const houseT   = useMemo(() => templates.filter((t) => t.account_type === "house"),   [templates]);

  return (
    <>
      <div className="card-modern mb-3">
        <div className="small" style={{ color: "var(--text-dim)" }}>
          <i className="bi bi-info-circle me-1" />
          Templates auto-generate an unpaid expense for the current and each new future month.
          Editing a template only affects <strong>future</strong> generated months — history is never changed.
        </div>
      </div>

      <TemplateSection
        title="Personal Account"
        icon="bi-person"
        accountType="private"
        templates={privateT}
        categories={categories.map((c) => c.name)}
        onAdd={() => openAdd("private")}
        onEdit={openEdit}
        onDelete={(t) => setPendingDelete(t)}
      />
      <div className="mt-4" />
      <TemplateSection
        title="House Account"
        icon="bi-house"
        accountType="house"
        templates={houseT}
        categories={categories.map((c) => c.name)}
        onAdd={() => openAdd("house")}
        onEdit={openEdit}
        onDelete={(t) => setPendingDelete(t)}
      />

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={save}
        initial={editing}
        showSplit={modalAccount === "house"}
        categories={categories.map((c) => c.name)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Delete template"
        message={`Delete "${pendingDelete?.name}"? Historical expenses already created from this template will remain unchanged.`}
      />
    </>
  );
}

function TemplateSection({
  title, icon, accountType, templates, onAdd, onEdit, onDelete,
}: {
  title: string; icon: string;
  accountType: "private" | "house";
  templates: Template[];
  categories: string[];
  onAdd: () => void;
  onEdit: (t: Template) => void;
  onDelete: (t: Template) => void;
}) {
  const isHouse = accountType === "house";
  const total = templates.reduce((s, t) => s + parseFloat(t.amount as any), 0);

  return (
    <div className="card-modern">
      <div className="section-header">
        <div>
          <h2 className="h5 mb-0"><i className={"bi " + icon + " me-2"} />{title}</h2>
          <div className="subtitle">
            {templates.length} template{templates.length === 1 ? "" : "s"} · monthly total {fmtMoney(total)}
          </div>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1" />Add template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center p-4" style={{ color: "var(--text-dim)" }}>
          No templates yet — add one to auto-create it every month.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr style={{ color: "var(--text-dim)", fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".04em" }}>
                <th>Name</th>
                <th>Category</th>
                <th className="text-end">Amount</th>
                {isHouse && <th className="text-end">Split</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="fw-semibold">{t.name}</div>
                    {t.notes && <div className="small" style={{ color: "var(--text-dim)" }}>{t.notes}</div>}
                  </td>
                  <td><span className="badge text-bg-secondary">{t.category ?? "—"}</span></td>
                  <td className="text-end fw-semibold">{fmtMoney(parseFloat(t.amount as any))}</td>
                  {isHouse && (
                    <td className="text-end small" style={{ color: "var(--text-dim)" }}>
                      C {parseFloat(t.chazy_percentage as any)}% · H {parseFloat(t.helly_percentage as any)}%
                    </td>
                  )}
                  <td className="text-end">
                    <button className="btn btn-sm btn-ghost" onClick={() => onEdit(t)} title="Edit">
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onDelete(t)} title="Delete">
                      <i className="bi bi-trash" style={{ color: "var(--danger)" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TemplateModal({
  open, onClose, onSave, initial, showSplit, categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: TemplateDraft) => void;
  initial?: TemplateDraft;
  showSplit: boolean;
  categories: string[];
}) {
  const catList = categories.length > 0 ? categories : ["General"];
  const [form, setForm] = useState<TemplateDraft>({
    name: "", amount: 0, category: catList[0], notes: "",
    default_paid: false, chazy_percentage: 50, helly_percentage: 50,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      name: initial?.name ?? "",
      amount: initial?.amount ?? 0,
      category: initial?.category || catList[0],
      notes: initial?.notes ?? "",
      default_paid: initial?.default_paid ?? false,
      chazy_percentage: initial?.chazy_percentage ?? 50,
      helly_percentage: initial?.helly_percentage ?? 50,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const cz = form.chazy_percentage;
  const he = form.helly_percentage;
  const total = Math.round((cz + he) * 100) / 100;
  const splitInvalid = showSplit && total !== 100;
  const canSave = !!form.name.trim() && !splitInvalid;

  const setCz = (n: number) => {
    const v = isNaN(n) ? 0 : n;
    setForm({ ...form, chazy_percentage: v, helly_percentage: Math.max(0, Math.round((100 - v) * 100) / 100) });
  };
  const setHe = (n: number) => {
    const v = isNaN(n) ? 0 : n;
    setForm({ ...form, helly_percentage: v, chazy_percentage: Math.max(0, Math.round((100 - v) * 100) / 100) });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Edit template" : "Add monthly template"}>
      <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(form); }}>
        <div className="mb-3">
          <label className="form-label small text-secondary">Name</label>
          <input autoFocus className="form-control" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix" />
        </div>
        <div className="row g-3">
          <div className="col-6">
            <label className="form-label small text-secondary">Monthly amount</label>
            <input type="number" step="0.01" className="form-control" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="col-6">
            <label className="form-label small text-secondary">Category</label>
            <select className="form-select" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(catList.includes(form.category) ? catList : [form.category, ...catList]).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {showSplit && (
          <div className="mt-3 p-3 rounded"
               style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label small text-secondary mb-0">Split between Chazy &amp; Helly</label>
              <span className={"small fw-semibold " + (splitInvalid ? "text-danger" : "text-success")}>
                Total: {total}%
              </span>
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small text-secondary">Chazy %</label>
                <div className="input-group">
                  <input type="number" step="0.01" min="0" max="100"
                    className={"form-control" + (splitInvalid ? " is-invalid" : "")}
                    value={cz} onChange={(e) => setCz(parseFloat(e.target.value))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-6">
                <label className="form-label small text-secondary">Helly %</label>
                <div className="input-group">
                  <input type="number" step="0.01" min="0" max="100"
                    className={"form-control" + (splitInvalid ? " is-invalid" : "")}
                    value={he} onChange={(e) => setHe(parseFloat(e.target.value))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            {splitInvalid && (
              <div className="text-danger small mt-2">
                <i className="bi bi-exclamation-circle me-1" />
                The combined percentage must equal 100%.
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="form-label small text-secondary">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="form-check mt-3">
          <input className="form-check-input" type="checkbox" id="defaultPaid"
            checked={form.default_paid}
            onChange={(e) => setForm({ ...form, default_paid: e.target.checked })} />
          <label className="form-check-label" htmlFor="defaultPaid">
            Mark generated expenses as already paid
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            <i className="bi bi-check-lg me-1" />Save template
          </button>
        </div>
      </form>
    </Modal>
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