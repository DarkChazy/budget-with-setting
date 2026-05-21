export const fmtMoney = (n: number | string) => {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "€0.00";
  return v.toLocaleString("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const monthKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

export const parseMonth = (key: string) => new Date(key + "T00:00:00");

export const monthLabel = (key: string) => {
  const d = parseMonth(key);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

export const monthShort = (key: string) => parseMonth(key).toLocaleString("en-US", { month: "short" });

export const addMonths = (key: string, n: number) => {
  const d = parseMonth(key);
  d.setMonth(d.getMonth() + n);
  return monthKey(d);
};

export const currentMonth = () => monthKey(new Date());

export const yearMonths = (year: number) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
