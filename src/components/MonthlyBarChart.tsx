import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { monthShort, yearMonths } from "@/lib/format";

Chart.register(...registerables);

export function MonthlyBarChart({
  title,
  year,
  values,
  color = "#3b82f6",
}: {
  title: string;
  year: number;
  values: number[];
  color?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const labels = yearMonths(year).map(monthShort);
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: color + "cc",
          borderColor: color,
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#181d26",
            titleColor: "#e6e9ef",
            bodyColor: "#e6e9ef",
            borderColor: "#232a36",
            borderWidth: 1,
            padding: 10,
            callbacks: { label: (ctx) => "$" + Number(ctx.parsed.y).toFixed(2) },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8a93a3" } },
          y: {
            grid: { color: "#232a36" },
            ticks: { color: "#8a93a3", callback: (v) => "$" + v },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [title, year, values.join(","), color]);

  return <div className="chart-wrap"><canvas ref={ref} /></div>;
}
