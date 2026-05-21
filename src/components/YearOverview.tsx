import { fmtMoney, monthShort, yearMonths } from "@/lib/format";

export type MonthStat = {
  month: string;
  income: number;
  unpaidExpenses: number;
  ccBilled: number;
  balance: number;
};

export function YearOverview({
  year,
  stats,
  activeMonth,
  onSelectMonth,
  showCC = true,
}: {
  year: number;
  stats: Map<string, MonthStat>;
  activeMonth?: string;
  onSelectMonth: (m: string) => void;
  showCC?: boolean;
}) {
  const months = yearMonths(year);
  return (
    <div className="year-grid">
      {months.map((m) => {
        const s = stats.get(m);
        const balance = s?.balance ?? 0;
        const neg = balance < 0;
        return (
          <div
            key={m}
            className={"month-card" + (activeMonth === m ? " active" : "")}
            onClick={() => onSelectMonth(m)}
          >
            <div className="month-name">{monthShort(m)} {year}</div>
            <div className="stat"><span>Income</span><span className="v">{fmtMoney(s?.income ?? 0)}</span></div>
            <div className="stat"><span>Unpaid</span><span className="v">{fmtMoney(s?.unpaidExpenses ?? 0)}</span></div>
            {showCC && (
              <div className="stat"><span>Credit</span><span className="v">{fmtMoney(s?.ccBilled ?? 0)}</span></div>
            )}
            <div className="balance">
              <span>Balance</span>
              <span className={"v" + (neg ? " negative" : "")}>{fmtMoney(balance)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
