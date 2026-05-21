import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { monthLabel, yearMonths, fmtMoney } from "@/lib/format";

export type ExpenseDraft = {
  id?: string;
  name: string;
  amount: number;
  expense_month: string;
  notes: string;
  category: string;
  recurring_type: "one_time" | "monthly" | "yearly";
  chazy_percentage?: number;
  helly_percentage?: number;
};

const FALLBACK_CATEGORIES = ["General"];

export function ExpenseModal({
  open, onClose, onSave, initial, defaultMonth, hideRecurring = false, monthLabel: monthLabelText = "Month",
  showSplit = false, categories, defaultChazyPct = 50, defaultHellyPct = 50,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: ExpenseDraft) => void;
  initial?: Partial<ExpenseDraft>;
  defaultMonth: string;
  hideRecurring?: boolean;
  monthLabel?: string;
  showSplit?: boolean;
  categories?: string[];
  defaultChazyPct?: number;
  defaultHellyPct?: number;
}) {
  const catList = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const [form, setForm] = useState<ExpenseDraft>({
    name: "", amount: 0, expense_month: defaultMonth, notes: "", category: catList[0], recurring_type: "one_time",
    chazy_percentage: defaultChazyPct, helly_percentage: defaultHellyPct,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        amount: initial?.amount ?? 0,
        expense_month: initial?.expense_month ?? defaultMonth,
        notes: initial?.notes ?? "",
        category: initial?.category ?? catList[0],
        recurring_type: initial?.recurring_type ?? "one_time",
        chazy_percentage: initial?.chazy_percentage ?? defaultChazyPct,
        helly_percentage: initial?.helly_percentage ?? defaultHellyPct,
        id: initial?.id,
      });
    }
  }, [open, initial, defaultMonth, defaultChazyPct, defaultHellyPct]);

  const year = parseInt(form.expense_month.slice(0, 4), 10);

  const cz = form.chazy_percentage ?? 0;
  const he = form.helly_percentage ?? 0;
  const total = Math.round((cz + he) * 100) / 100;
  const splitValid = !showSplit || total === 100;
  const splitError = showSplit && total !== 100;

  const chazyAmount = useMemo(() => (form.amount * cz) / 100, [form.amount, cz]);
  const hellyAmount = useMemo(() => (form.amount * he) / 100, [form.amount, he]);

  const setChazy = (n: number) => {
    const v = isNaN(n) ? 0 : n;
    setForm({ ...form, chazy_percentage: v, helly_percentage: Math.max(0, Math.round((100 - v) * 100) / 100) });
  };
  const setHelly = (n: number) => {
    const v = isNaN(n) ? 0 : n;
    setForm({ ...form, helly_percentage: v, chazy_percentage: Math.max(0, Math.round((100 - v) * 100) / 100) });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Edit expense" : "Add expense"}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        if (!splitValid) return;
        onSave(form);
        onClose();
      }}>
        <div className="mb-3">
          <label className="form-label small text-secondary">Name</label>
          <input autoFocus className="form-control" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electricity" />
        </div>
        <div className="row g-3">
          <div className="col-6">
            <label className="form-label small text-secondary">Price</label>
            <input type="number" step="0.01" className="form-control" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="col-6">
            <label className="form-label small text-secondary">{monthLabelText}</label>
            <select className="form-select" value={form.expense_month}
              onChange={(e) => setForm({ ...form, expense_month: e.target.value })}>
              {[year - 1, year, year + 1].map((y) =>
                yearMonths(y).map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="row g-3 mt-1">
          <div className="col-6">
            <label className="form-label small text-secondary">Category</label>
            <select className="form-select" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {/* include current category even if no longer in user list, so editing old expenses doesn't lose it */}
              {(catList.includes(form.category) ? catList : [form.category, ...catList]).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {!hideRecurring && (
            <div className="col-6">
              <label className="form-label small text-secondary">Recurring</label>
              <select className="form-select" value={form.recurring_type}
                onChange={(e) => setForm({ ...form, recurring_type: e.target.value as any })}>
                <option value="one_time">One time</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>

        {showSplit && (
          <div className="mt-3 p-3 rounded" style={{ background: "var(--surface-2, rgba(255,255,255,.03))", border: "1px solid var(--border, rgba(255,255,255,.08))" }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label small text-secondary mb-0">Split between Chazy & Helly</label>
              <span className={"small fw-semibold " + (splitError ? "text-danger" : "text-success")}>
                Total: {total}%
              </span>
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small text-secondary">Chazy %</label>
                <div className="input-group">
                  <input
                    type="number" step="0.01" min="0" max="100"
                    className={"form-control" + (splitError ? " is-invalid" : "")}
                    value={cz}
                    onChange={(e) => setChazy(parseFloat(e.target.value))}
                  />
                  <span className="input-group-text">%</span>
                </div>
                <div className="small mt-1" style={{ color: "var(--text-dim)" }}>{fmtMoney(chazyAmount)}</div>
              </div>
              <div className="col-6">
                <label className="form-label small text-secondary">Helly %</label>
                <div className="input-group">
                  <input
                    type="number" step="0.01" min="0" max="100"
                    className={"form-control" + (splitError ? " is-invalid" : "")}
                    value={he}
                    onChange={(e) => setHelly(parseFloat(e.target.value))}
                  />
                  <span className="input-group-text">%</span>
                </div>
                <div className="small mt-1" style={{ color: "var(--text-dim)" }}>{fmtMoney(hellyAmount)}</div>
              </div>
            </div>
            {splitError && (
              <div className="text-danger small mt-2">
                <i className="bi bi-exclamation-circle me-1" />
                The combined percentage for Chazy and Helly must equal 100%.
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="form-label small text-secondary">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!splitValid}>
            <i className="bi bi-check-lg me-1" /> Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
