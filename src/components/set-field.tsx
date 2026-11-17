import { useState } from "react";
import { formatSetValue, parseSetInput } from "@/lib/training/set-input";

/** Keeps the raw text the user types ("22,") and reports the parsed number upward. */
export function SetField({ label, ariaLabel, mode, value, onValue }: {
  label: string;
  ariaLabel: string;
  mode: "numeric" | "decimal";
  value: number | null;
  onValue: (v: number | null) => void;
}) {
  const kind = mode === "numeric" ? "integer" : "decimal";
  const [text, setText] = useState(() => formatSetValue(value));
  const parsed = parseSetInput(text, kind);
  return (
    <label className="flex flex-1 items-center gap-1">
      <input
        inputMode={mode}
        aria-label={ariaLabel}
        aria-invalid={parsed === undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseSetInput(e.target.value, kind);
          if (v !== undefined) onValue(v);
        }}
        onBlur={() => { if (parsed !== undefined) setText(formatSetValue(parsed)); }}
        className={`input py-2 text-center tabular-nums ${parsed === undefined ? "border-danger" : ""}`}
      />
      <span className="text-xs text-muted">{label}</span>
    </label>
  );
}
