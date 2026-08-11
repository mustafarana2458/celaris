import { ButtonHTMLAttributes, forwardRef } from "react";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

// Vibrant blue CTA per the redesign doc -- intentionally not the app's
// user-configurable accent color, since that preference doesn't exist yet
// for a signed-out visitor and the doc calls for blue specifically here.
export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className = "", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

AuthButton.displayName = "AuthButton";
