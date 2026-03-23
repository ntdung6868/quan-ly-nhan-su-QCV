import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400",
  danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400",
  ghost: "hover:bg-gray-100 text-gray-600 disabled:text-gray-300",
  outline: "border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:text-gray-300",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
    </button>
  );
}
