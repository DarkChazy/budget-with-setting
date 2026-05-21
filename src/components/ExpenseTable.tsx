import { useState } from "react";
import { fmtMoney, monthShort } from "@/lib/format";
import { ConfirmModal } from "./ConfirmModal";

export type ExpenseRow = {
  id: string;
  name: string;
  amount: number | string;
  expense_month?: string;
  billing_month?: string;
  is_paid: boolean;
  notes?: string | null;
  category?: string | null;
  recurring_type?: string;
  chazy_percentage?: number | string;
  helly_percentage?: number | string;
};

export function ExpenseTable({
  rows,
  monthColumnLabel = "Month",
  showSplit = false,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  rows: ExpenseRow[];
  monthColumnLabel?: string;
  showSplit?: boolean;
  onTogglePaid: (r: ExpenseRow, paid: boolean) => void;
  onEdit: (r: ExpenseRow) => void;
  onDelete: (r: ExpenseRow) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<ExpenseRow | null>(null);

  const sorted = [...rows].sort((a, b) => {
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
        <i className="bi bi-inbox" style={{ fontSize: "2rem", opacity: .5 }} /><br />
        <span className="small">No expenses yet</span>
      </div>
    );
  }

  return (
    <>
      <table className="table-modern">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Name</th>
            <th style={{ width: 140 }}>Price</th>
            {showSplit && <th style={{ width: 150 }}>Chazy</th>}
            {showSplit && <th style={{ width: 150 }}>Helly</th>}
            <th style={{ width: 130 }}>{monthColumnLabel}</th>
            <th style={{ width: 110 }}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const m = r.expense_month ?? r.billing_month ?? "";
            const amt = typeof r.amount === "string" ? parseFloat(r.amount) : r.amount;
            const cz = parseFloat((r.chazy_percentage ?? 50) as any);
            const he = parseFloat((r.helly_percentage ?? 50) as any);
            return (
              <tr key={r.id} className={r.is_paid ? "paid" : ""}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={r.is_paid}
                    onChange={(e) => onTogglePaid(r, e.target.checked)}
                  />
                </td>
                <td>
                  <div>{r.name}</div>
                  {r.category && (
                    <div className="small" style={{ color: "var(--text-dim)", fontSize: ".75rem" }}>
                      {r.category}{r.recurring_type && r.recurring_type !== "one_time" ? ` · ${r.recurring_type}` : ""}
                    </div>
                  )}
                </td>
                <td className="amount-cell">{fmtMoney(amt)}</td>
                {showSplit && (
                  <td>
                    <div className="amount-cell">{fmtMoney((amt * cz) / 100)}</div>
                    <div className="small" style={{ color: "var(--text-dim)", fontSize: ".75rem" }}>{cz}%</div>
                  </td>
                )}
                {showSplit && (
                  <td>
                    <div className="amount-cell">{fmtMoney((amt * he) / 100)}</div>
                    <div className="small" style={{ color: "var(--text-dim)", fontSize: ".75rem" }}>{he}%</div>
                  </td>
                )}
                <td style={{ color: "var(--text-muted)" }}>{m ? monthShort(m) + " " + m.slice(0, 4) : ""}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => onEdit(r)} title="Edit"><i className="bi bi-pencil" /></button>
                    <button className="delete" onClick={() => setPendingDelete(r)} title="Delete"><i className="bi bi-trash" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmModal
        open={!!pendingDelete}
        title="Delete expense?"
        message={`Remove "${pendingDelete?.name}"? This can't be undone.`}
        onConfirm={() => pendingDelete && onDelete(pendingDelete)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
