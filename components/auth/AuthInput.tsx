import { InputHTMLAttributes, forwardRef } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

// Auth-only input styling per the public-site redesign doc (neutral/blue
// palette). Deliberately not merged into the shared components/ui/Input --
// that one is used across the dashboard and shouldn't inherit this look.
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-neutral-300">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-shadow focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:text-gray-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:disabled:text-neutral-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
