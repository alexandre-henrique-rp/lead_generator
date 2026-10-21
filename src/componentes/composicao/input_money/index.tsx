import { useState } from "react";
import type { ChangeEvent } from "react";
import { formatCurrencyBRL, parseCurrencyBRLToCents } from "#/lib/format";

export interface InputMoneyProps {
  centsValue?: number;
  onCentsChange?: (cents: number) => void;
  readonly?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function InputMoney({
  centsValue = 0,
  onCentsChange,
  readonly = false,
  placeholder = "R$ 0,00",
  className = "",
  disabled = false,
}: InputMoneyProps) {
  const [displayValue, setDisplayValue] = useState(() => formatCurrencyBRL(centsValue));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const cents = Number.parseInt(rawDigits || "0", 10);
    const formatted = formatCurrencyBRL(cents);
    setDisplayValue(formatted);
    onCentsChange?.(cents);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      readOnly={readonly}
      disabled={disabled}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 font-mono placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 read-only:bg-slate-900 read-only:text-slate-400 read-only:cursor-not-allowed ${className}`}
    />
  );
}
