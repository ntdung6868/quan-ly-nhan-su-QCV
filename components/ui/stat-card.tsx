import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "indigo";
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: { text: "text-blue-600 dark:text-blue-400", icon: "bg-blue-100 dark:bg-blue-900/30" },
  green: { text: "text-green-600 dark:text-green-400", icon: "bg-green-100 dark:bg-green-900/30" },
  yellow: { text: "text-yellow-600 dark:text-yellow-400", icon: "bg-yellow-100 dark:bg-yellow-900/30" },
  red: { text: "text-red-600 dark:text-red-400", icon: "bg-red-100 dark:bg-red-900/30" },
  purple: { text: "text-purple-600 dark:text-purple-400", icon: "bg-purple-100 dark:bg-purple-900/30" },
  indigo: { text: "text-indigo-600 dark:text-indigo-400", icon: "bg-indigo-100 dark:bg-indigo-900/30" },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = "blue", trend }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-card text-card-foreground rounded-xl ring-1 ring-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", colors.text)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
              trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              <span>{trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", colors.icon)}>
          <Icon size={20} className={colors.text} />
        </div>
      </div>
    </div>
  );
}
