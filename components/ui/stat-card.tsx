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
  blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100" },
  green: { bg: "bg-green-50", text: "text-green-600", icon: "bg-green-100" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600", icon: "bg-yellow-100" },
  red: { bg: "bg-red-50", text: "text-red-600", icon: "bg-red-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", icon: "bg-indigo-100" },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = "blue", trend }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", colors.text)}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              <span className="text-gray-400 font-normal">{trend.label}</span>
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
