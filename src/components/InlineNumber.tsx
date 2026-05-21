import { useEffect, useRef, useState } from "react";

export function InlineNumber({
  value,
  onSave,
  className = "",
  prefix = "$",
}: {
  value: number;
  onSave: (n: number) => void;
  className?: string;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value.toFixed(2)); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n !== value) onSave(parseFloat(n.toFixed(2)));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        className={className}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }
  const neg = value < 0;
  return (
    <span
      className={className + (neg ? " negative" : "")}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {prefix}{Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {neg ? "" : ""}
    </span>
  );
}
