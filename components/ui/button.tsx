import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses = {
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50",
  secondary: "bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50",
  danger: "bg-destructive hover:bg-destructive/90 text-white disabled:opacity-50",
  ghost: "hover:bg-accent text-foreground disabled:opacity-50",
  outline: "border border-border hover:bg-accent text-foreground disabled:opacity-50",
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
