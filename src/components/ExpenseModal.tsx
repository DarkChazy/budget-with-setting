import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { monthLabel, yearMonths } from "@/lib/format";

export type ExpenseDraft = {
  id?: string;
  name: string;
  amount: number;
  expense_month: string;
  notes: string;
  category: string;
  recurring_type: "one_time" | "monthly" | "yearly";
};

const CATEGORIES = ["General", "Groceries", "Rent", "Utilities", "Subscriptions", "Transport", "Dining", "Health", "Entertainment", "Other"];

export function ExpenseModal({
  open, onClose, onSave, initial, defaultMonth, hideRecurring = false, monthLabel: monthLabelText = "Month",
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: ExpenseDraft) => void;
  initial?: Partial<ExpenseDraft>;
  defaultMonth: string;
  hideRecurring?: boolean;
  monthLabel?: string;
}) {
  const [form, setForm] = useState<ExpenseDraft>({
    name: "", amount: 0, expense_month: defaultMonth, notes: "", category: "General", recurring_type: "one_time",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        amount: initial?.amount ?? 0,
        expense_month: initial?.expense_month ?? defaultMonth,
        notes: initial?.notes ?? "",
        category: initial?.category ?? "General",
        recurring_type: initial?.recurring_type ?? "one_time",
        id: initial?.id,
      });
    }
  }, [open, initial, defaultMonth]);

  const year = parseInt(form.expense_month.slice(0, 4), 10);

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Edit expense" : "Add expense"}>
      <form onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) { onSave(form); onClose(); } }}>
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
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
        <div className="mt-3">
          <label className="form-label small text-secondary">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            <i className="bi bi-check-lg me-1" /> Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
