import { addMonths, monthLabel, yearMonths } from "@/lib/format";

export function MonthSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (m: string) => void;
}) {
  const year = parseInt(value.slice(0, 4), 10);
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = addMonths(thisMonth, 1);

  return (
    <div className="month-nav">
      <button
        className={"btn " + (value === thisMonth ? "btn-primary" : "btn-outline-light")}
        onClick={() => onChange(thisMonth)}
      >
        This Month
      </button>
      <button
        className={"btn " + (value === nextMonth ? "btn-primary" : "btn-outline-light")}
        onClick={() => onChange(nextMonth)}
      >
        Next Month
      </button>
      <select
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {[year - 1, year, year + 1].map((y) =>
          yearMonths(y).map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))
        )}
      </select>
    </div>
  );
}
