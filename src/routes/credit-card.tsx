import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  deleteCC,
  listCC,
  setCCPaid,
  upsertCC,
} from "@/lib/api.functions";
import { useCurrentUser } from "@/lib/auth";
import { currentMonth, fmtMoney, monthLabel, yearMonths } from "@/lib/format";
import { ExpenseModal, type ExpenseDraft } from "@/components/ExpenseModal";
import { ExpenseTable, type ExpenseRow } from "@/components/ExpenseTable";
import { MonthSelector } from "@/components/MonthSelector";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { useCategories } from "@/lib/settings";

export const Route = createFileRoute("/credit-card")({ component: () => <AppLayout><CCPage /></AppLayout> });

function CCPage() {
  const { user } = useCurrentUser();
  const { categories } = useCategories(user?.id);
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDraft | undefined>();

  const load = useCallback(async () => {
    if (!user) return;
    const data = await listCC({ data: { year } });
    setRows((data ?? []).map((r: any) => ({ ...r, expense_month: undefined })) as any);
  }, [user?.id, year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setYear(parseInt(month.slice(0, 4))); }, [month]);

  const monthRows = useMemo(() => rows.filter((r) => r.billing_month === month), [rows, month]);
  const monthTotal = monthRows.reduce((s, r) => s + parseFloat(r.amount as any), 0);

  const togglePaid = async (r: ExpenseRow, paid: boolean) => {
    setRows((xs) => xs.map((x) => x.id === r.id ? { ...x, is_paid: paid } : x));
    await setCCPaid({ data: { id: r.id, paid } });
  };
  const del = async (r: ExpenseRow) => {
    setRows((xs) => xs.filter((x) => x.id !== r.id));
    await deleteCC({ data: { id: r.id } });
  };
  const save = async (e: ExpenseDraft) => {
    if (!user) return;
    await upsertCC({
      data: {
        id: e.id,
        name: e.name,
        amount: e.amount,
        billing_month: e.expense_month,
        notes: e.notes,
        category: e.category,
      },
    });
    load();
  };

  const totals = useMemo(
    () => yearMonths(year).map((mk) =>
      rows.filter((r) => r.billing_month === mk).reduce((s, r) => s + parseFloat(r.amount as any), 0)
    ), [rows, year]
  );

  return (
    <>
      <div className="page-header">
        <h1>Credit Card</h1>
        <p>Track purchases by billing month — billing month is what affects your balance</p>
      </div>

      <div className="card-modern mb-4">
        <div className="summary-card">
          <div>
            <div className="summary-label">Total billed · {monthLabel(month)}</div>
            <div className="summary-amount" style={{ cursor: "default" }}>{fmtMoney(monthTotal)}</div>
          </div>
          <MonthSelector value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="card-modern mb-4">
        <div className="section-header">
          <div>
            <h2>Purchases · {monthLabel(month)}</h2>
            <div className="subtitle">{monthRows.length} item{monthRows.length === 1 ? "" : "s"}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(undefined); setModalOpen(true); }}>
            <i className="bi bi-plus-lg me-1" /> Add purchase
          </button>
        </div>
        <ExpenseTable
          rows={monthRows.map((r) => ({ ...r, expense_month: r.billing_month }))}
          monthColumnLabel="Billing"
          onTogglePaid={togglePaid}
          onEdit={(r) => {
            setEditing({
              id: r.id, name: r.name, amount: parseFloat(r.amount as any),
              expense_month: r.expense_month!, notes: r.notes ?? "",
              category: r.category ?? "General", recurring_type: "one_time",
            });
            setModalOpen(true);
          }}
          onDelete={del}
        />
      </div>

      <div className="card-modern">
        <div className="section-header"><h2>Monthly credit card spending · {year}</h2></div>
        <MonthlyBarChart title="Credit card" year={year} values={totals} color="#10b981" />
      </div>

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={save}
        initial={editing}
        defaultMonth={month}
        hideRecurring
        monthLabel="Billing month"
        categories={categories.map((c) => c.name)}
      />
    </>
  );
}
