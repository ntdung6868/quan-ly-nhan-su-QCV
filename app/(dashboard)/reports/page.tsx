"use client";

import { useState } from "react";
import { useReportData } from "@/hooks/use-reports";
import { StatCard } from "@/components/ui/stat-card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Users, Clock, DollarSign, CalendarOff, TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};

const yearOptions = [2024, 2025, 2026, 2027].map((y) => ({
  value: String(y),
  label: `Năm ${y}`,
}));

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useReportData(selectedYear);

  const summary = data?.summary ?? {
    totalEmployees: 0,
    totalPayroll: 0,
    avgAttendanceRate: 0,
    totalLeaves: 0,
  };
  const monthlyAttendance = data?.monthlyAttendance ?? [];
  const departmentData = data?.departmentData ?? [];
  const monthlySalary = data?.monthlySalary ?? [];
  const leaveStats = data?.leaveStats ?? [];

  return (
    <div className="space-y-6">
      {/* Year filter */}
      <div className="flex items-center gap-3">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
          options={yearOptions}
          className="w-36"
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng nhân viên"
          value={summary.totalEmployees}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Tổng quỹ lương"
          value={formatCurrency(summary.totalPayroll)}
          subtitle={`Năm ${selectedYear}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Nghỉ phép (duyệt)"
          value={summary.totalLeaves}
          subtitle={`Năm ${selectedYear}`}
          icon={CalendarOff}
          color="yellow"
        />
        <StatCard
          title="Lương bình quân"
          value={
            summary.totalEmployees > 0
              ? formatCurrency(summary.totalPayroll / 12 / summary.totalEmployees)
              : "\u2014"
          }
          subtitle="Tháng/người"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl ring-1 ring-border p-5">
              <div className="h-5 w-48 rounded bg-muted animate-pulse mb-4" />
              <div className="h-55 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly attendance rate */}
          <div className="bg-card rounded-xl ring-1 ring-border p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Tỷ lệ chấm công theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, "Tỷ lệ"]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Tỷ lệ có mặt"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly salary */}
          <div className="bg-card rounded-xl ring-1 ring-border p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Quỹ lương theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlySalary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(0)}tr`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [formatCurrency(v as number)]}
                />
                <Legend />
                <Bar dataKey="gross" fill="#93c5fd" name="Gross" radius={[2, 2, 0, 0]} />
                <Bar dataKey="net" fill="#3b82f6" name="Thực nhận" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Department distribution */}
          {departmentData.length > 0 && (
            <div className="bg-card rounded-xl ring-1 ring-border p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-500" /> Nhân viên theo phòng ban
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#8b5cf6" name="Nhân viên" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Leave by type */}
          {leaveStats.length > 0 && (
            <div className="bg-card rounded-xl ring-1 ring-border p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarOff size={16} className="text-yellow-500" /> Nghỉ phép theo loại
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={leaveStats}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {leaveStats.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {leaveStats.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground flex-1">{item.name}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance breakdown table */}
          <div className="lg:col-span-2 bg-card rounded-xl ring-1 ring-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="font-semibold text-foreground">Chấm công chi tiết theo tháng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Tháng</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Có mặt</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Vắng</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {monthlyAttendance
                    .filter((m) => m.present + m.absent > 0)
                    .map((m) => (
                      <tr key={m.month} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground">{m.month}</td>
                        <td className="px-4 py-2 text-green-600 dark:text-green-400">
                          {m.present}
                        </td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{m.absent}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full max-w-20">
                              <div
                                className="h-1.5 bg-blue-500 rounded-full"
                                style={{ width: `${m.rate}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground">{m.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
