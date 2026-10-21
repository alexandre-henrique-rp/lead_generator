import { useEffect, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { sanitizeTxt } from "./utils";

const baseClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 " +
  "placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none " +
  "focus:ring-2 focus:ring-indigo-500/30 read-only:cursor-not-allowed " +
  "read-only:bg-slate-950 read-only:text-slate-500 transition-colors";

export interface InputTxtProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value"> {
  valueContext?: string;
  readonly?: boolean;
  autoSanitize?: boolean;
}

export default function InputTxt({
  valueContext,
  readonly,
  autoSanitize = false,
  className = "",
  onChange,
  ...props
}: InputTxtProps) {
  const [value, setValue] = useState(() => (autoSanitize ? sanitizeTxt(valueContext ?? "") : (valueContext ?? "")));

  useEffect(() => {
    setValue(autoSanitize ? sanitizeTxt(valueContext ?? "") : (valueContext ?? ""));
  }, [valueContext, autoSanitize]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = autoSanitize ? sanitizeTxt(e.target.value) : e.target.value;
    e.target.value = val;
    setValue(val);
    onChange?.(e);
  };

  const input = (
    <input
      {...props}
      type={props.type || "text"}
      value={value}
      readOnly={readonly}
      onChange={handleChange}
      className={`${baseClass} ${className}`}
    />
  );

  if (readonly) {
    return (
      <div className="group relative w-full">
        {input}
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-amber-500 px-3 py-1 text-xs whitespace-nowrap text-slate-950 font-medium opacity-0 transition-opacity group-hover:opacity-100 shadow-sm z-20">
          Campo somente leitura
        </span>
      </div>
    );
  }

  return input;
}
