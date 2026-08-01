import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-400 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
