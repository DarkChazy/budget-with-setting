import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { currentMonth, fmtMoney, monthLabel, yearMonths } from "@/lib/format";
import { ExpenseModal, type ExpenseDraft } from "@/components/ExpenseModal";
import { ExpenseTable, type ExpenseRow } from "@/components/ExpenseTable";
import { InlineNumber } from "@/components/InlineNumber";
import { MonthSelector } from "@/components/MonthSelector";
import { YearOverview, type MonthStat } from "@/components/YearOverview";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { useCategories, useUserSettings, defaultMonthFor } from "@/lib/settings";

type AccountKind = "private" | "house";

export function AccountPage({ accountType, title }: { accountType: AccountKind; title: string }) {
  const { user } = useCurrentUser();
  const { settings } = useUserSettings(user?.id);
  const { categories } = useCategories(user?.id);
  const catNames = categories.map((c) => c.name);
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [accountAmount, setAccountAmount] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [ccExpenses, setCcExpenses] = useState<ExpenseRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDraft | undefined>();
  const showCC = accountType === "private";
  const isHouse = accountType === "house";

  const monthOffset = isHouse
    ? (settings?.default_house_month_offset ?? 0)
    : (settings?.default_private_month_offset ?? 0);
  const newExpenseDefaultMonth = defaultMonthFor(monthOffset);
  const defaultChazy = parseFloat((settings?.chazy_default_percentage ?? 60) as any);
  const defaultHelly = parseFloat((settings?.helly_default_percentage ?? 40) as any);

  const loadAccount = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("accounts")
      .select("current_amount").eq("user_id", user.id).eq("account_type", accountType).maybeSingle();
    setAccountAmount(parseFloat((data?.current_amount ?? 0) as any));
  }, [user?.id, accountType]);

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    const start = `${year}-01-01`;
    const end = `${year}-12-01`;
    const { data } = await supabase.from("expenses")
      .select("*").eq("user_id", user.id).eq("account_type", accountType)
      .is("deleted_at", null).gte("expense_month", start).lte("expense_month", end);
    setExpenses((data ?? []) as any);
    if (showCC) {
      const { data: cc } = await supabase.from("credit_card_expenses")
        .select("*").eq("user_id", user.id)
        .is("deleted_at", null).gte("billing_month", start).lte("billing_month", end);
      setCcExpenses((cc ?? []) as any);
    }
  }, [user?.id, accountType, year, showCC]);

  useEffect(() => { loadAccount(); }, [loadAccount]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { setYear(parseInt(month.slice(0, 4))); }, [month]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.expense_month === month),
    [expenses, month]
  );

  const stats = useMemo(() => {
    const m = new Map<string, MonthStat>();
    for (const mk of yearMonths(year)) {
      const me = expenses.filter((e) => e.expense_month === mk);
      const unpaid = me.filter((e) => !e.is_paid).reduce((s, e) => s + parseFloat(e.amount as any), 0);
      const ccBilled = showCC
        ? ccExpenses.filter((c) => c.billing_month === mk).reduce((s, c) => s + parseFloat(c.amount as any), 0)
        : 0;
      m.set(mk, {
        month: mk,
        income: accountAmount,
        unpaidExpenses: unpaid,
        ccBilled,
        balance: accountAmount - unpaid - ccBilled,
      });
    }
    return m;
  }, [expenses, ccExpenses, year, accountAmount, showCC]);

  const current = stats.get(month);
  const balance = current?.balance ?? 0;
  const ccThisMonth = current?.ccBilled ?? 0;
  const unpaidThisMonth = current?.unpaidExpenses ?? 0;

  const splitTotals = useMemo(() => {
    let chazy = 0, helly = 0;
    for (const e of monthExpenses) {
      if (e.is_paid) continue;
      const amt = parseFloat(e.amount as any);
      const cz = parseFloat((e.chazy_percentage ?? 50) as any);
      const he = parseFloat((e.helly_percentage ?? 50) as any);
      chazy += (amt * cz) / 100;
      helly += (amt * he) / 100;
    }
    return { chazy, helly };
  }, [monthExpenses]);

  const saveAmount = async (n: number) => {
    if (!user) return;
    setAccountAmount(n);
    await supabase.from("accounts").update({ current_amount: n })
      .eq("user_id", user.id).eq("account_type", accountType);
  };

  const togglePaid = async (r: ExpenseRow, paid: boolean) => {
    setExpenses((xs) => xs.map((x) => x.id === r.id ? { ...x, is_paid: paid } : x));
    await supabase.from("expenses").update({ is_paid: paid }).eq("id", r.id);
  };

  const deleteExpense = async (r: ExpenseRow) => {
    setExpenses((xs) => xs.filter((x) => x.id !== r.id));
    await supabase.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
  };

  const saveExpense = async (e: ExpenseDraft) => {
    if (!user) return;
    const payload: any = {
      name: e.name, amount: e.amount, expense_month: e.expense_month,
      notes: e.notes, category: e.category, recurring_type: e.recurring_type,
    };
    if (isHouse) {
      payload.chazy_percentage = e.chazy_percentage ?? 50;
      payload.helly_percentage = e.helly_percentage ?? 50;
    }
    if (e.id) {
      await supabase.from("expenses").update(payload).eq("id", e.id);
    } else {
      await supabase.from("expenses").insert({
        user_id: user.id, account_type: accountType, ...payload,
      });
    }
    loadExpenses();
  };

  const monthlyTotals = useMemo(
    () => yearMonths(year).map((mk) =>
      expenses.filter((e) => e.expense_month === mk).reduce((s, e) => s + parseFloat(e.amount as any), 0)
    ), [expenses, year]
  );
  const ccTotals = useMemo(
    () => yearMonths(year).map((mk) =>
      ccExpenses.filter((c) => c.billing_month === mk).reduce((s, c) => s + parseFloat(c.amount as any), 0)
    ), [ccExpenses, year]
  );

  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
        <p>Track expenses and project your balance</p>
      </div>

      <div className="card-modern mb-4">
        <div className="summary-card">
          <div>
            <div className="summary-label">Current account amount</div>
            <InlineNumber value={accountAmount} onSave={saveAmount} className="summary-amount" />
          </div>
          <MonthSelector value={month} onChange={setMonth} />
          <div className="balance-pill">
            <span className="label">Projected balance · {monthLabel(month)}</span>
            <span className={"value" + (balance < 0 ? " negative" : "")}>{fmtMoney(balance)}</span>
            <span className="small" style={{ color: "var(--text-dim)", fontSize: ".75rem" }}>
              {fmtMoney(accountAmount)} − {fmtMoney(unpaidThisMonth)}{showCC ? ` − ${fmtMoney(ccThisMonth)}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="card-modern mb-4">
        <div className="section-header">
          <div>
            <h2>Expenses · {monthLabel(month)}</h2>
            <div className="subtitle">{monthExpenses.length} item{monthExpenses.length === 1 ? "" : "s"}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(undefined); setModalOpen(true); }}>
            <i className="bi bi-plus-lg me-1" /> Add expense
          </button>
        </div>
        <ExpenseTable
          rows={monthExpenses}
          showSplit={isHouse}
          onTogglePaid={togglePaid}
          onEdit={(r) => {
            setEditing({
              id: r.id, name: r.name, amount: parseFloat(r.amount as any),
              expense_month: r.expense_month!, notes: r.notes ?? "",
              category: r.category ?? "General",
              recurring_type: (r.recurring_type as any) ?? "one_time",
              chazy_percentage: parseFloat((r.chazy_percentage ?? 50) as any),
              helly_percentage: parseFloat((r.helly_percentage ?? 50) as any),
            });
            setModalOpen(true);
          }}
          onDelete={deleteExpense}
        />
      </div>

      {isHouse && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card-modern h-100" style={{ borderLeft: "3px solid #3b82f6" }}>
              <div className="summary-label">Chazy owes · {monthLabel(month)}</div>
              <div className="summary-amount" style={{ color: "#3b82f6" }}>{fmtMoney(splitTotals.chazy)}</div>
              <div className="small" style={{ color: "var(--text-dim)" }}>Unpaid expenses only</div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card-modern h-100" style={{ borderLeft: "3px solid #10b981" }}>
              <div className="summary-label">Helly owes · {monthLabel(month)}</div>
              <div className="summary-amount" style={{ color: "#10b981" }}>{fmtMoney(splitTotals.helly)}</div>
              <div className="small" style={{ color: "var(--text-dim)" }}>Unpaid expenses only</div>
            </div>
          </div>
        </div>
      )}

      <div className="card-modern mb-4">
        <div className="section-header">
          <div>
            <h2>Year overview · {year}</h2>
            <div className="subtitle">Click a month to jump to it</div>
          </div>
          <div className="month-nav">
            <button className="btn btn-outline-light" onClick={() => setYear(year - 1)}>
              <i className="bi bi-chevron-left" />
            </button>
            <span className="px-2" style={{ color: "var(--text-muted)" }}>{year}</span>
            <button className="btn btn-outline-light" onClick={() => setYear(year + 1)}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
        <YearOverview
          year={year}
          stats={stats}
          activeMonth={month}
          onSelectMonth={(m) => setMonth(m)}
          showCC={showCC}
        />
      </div>

      <div className="row g-3">
        <div className={showCC ? "col-lg-6" : "col-12"}>
          <div className="card-modern">
            <div className="section-header">
              <h2>Monthly expenses · {year}</h2>
            </div>
            <MonthlyBarChart title="Expenses" year={year} values={monthlyTotals} color="#3b82f6" />
          </div>
        </div>
        {showCC && (
          <div className="col-lg-6">
            <div className="card-modern">
              <div className="section-header">
                <h2>Credit card spending · {year}</h2>
              </div>
              <MonthlyBarChart title="Credit card" year={year} values={ccTotals} color="#10b981" />
            </div>
          </div>
        )}
      </div>

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveExpense}
        initial={editing}
        defaultMonth={editing ? month : newExpenseDefaultMonth}
        showSplit={isHouse}
        categories={catNames}
        defaultChazyPct={defaultChazy}
        defaultHellyPct={defaultHelly}
      />
    </>
  );
}
