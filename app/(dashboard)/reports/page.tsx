"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { Users, Clock, DollarSign, CalendarOff, TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalEmployees: 0, totalPayroll: 0, avgAttendanceRate: 0, totalLeaves: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState<{ month: string; rate: number; present: number; absent: number }[]>([]);
  const [departmentData, setDepartmentData] = useState<{ name: string; count: number }[]>([]);
  const [monthlySalary, setMonthlySalary] = useState<{ month: string; gross: number; net: number }[]>([]);
  const [leaveStats, setLeaveStats] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => { loadData(); }, [selectedYear]);

  async function loadData() {
    setIsLoading(true);
    const [empRes, payslipRes, leaveRes, deptRes] = await Promise.all([
      supabase.from("employees").select("id, department_id, department:departments(name)").eq("status", "active"),
      supabase.from("payslips").select("month, year, gross_salary, net_salary").eq("year", selectedYear),
      supabase.from("leaves").select("status, leave_type:leave_types(name)")
        .gte("start_date", `${selectedYear}-01-01`).lte("end_date", `${selectedYear}-12-31`),
      supabase.from("departments").select("id, name"),
    ]);

    const totalEmployees = empRes.data?.length || 0;
    const totalPayroll = (payslipRes.data || []).reduce((s, p) => s + p.net_salary, 0);
    const totalLeaves = (leaveRes.data || []).filter((l) => l.status === "approved").length;

    setSummary({ totalEmployees, totalPayroll, avgAttendanceRate: 0, totalLeaves });

    // Monthly salary
    const monthlyMap = new Map<number, { gross: number; net: number }>();
    (payslipRes.data || []).forEach((p) => {
      const existing = monthlyMap.get(p.month) || { gross: 0, net: 0 };
      monthlyMap.set(p.month, {
        gross: existing.gross + p.gross_salary,
        net: existing.net + p.net_salary,
      });
    });
    setMonthlySalary(
      Array.from({ length: 12 }, (_, i) => {
        const data = monthlyMap.get(i + 1) || { gross: 0, net: 0 };
        return { month: `T${i + 1}`, gross: data.gross, net: data.net };
      })
    );

    // Department distribution
    const deptMap = new Map<string, number>();
    (empRes.data || []).forEach((e) => {
      if (e.department_id) {
        deptMap.set(e.department_id, (deptMap.get(e.department_id) || 0) + 1);
      }
    });
    const deptWithNames = (deptRes.data || []).map((d) => ({
      name: d.name,
      count: deptMap.get(d.id) || 0,
    })).filter((d) => d.count > 0);
    setDepartmentData(deptWithNames);

    // Monthly attendance rate (mock calculation)
    const attMonthly = [];
    for (let m = 1; m <= 12; m++) {
      const { data: attData } = await supabase.from("attendance")
        .select("status")
        .gte("date", `${selectedYear}-${String(m).padStart(2, "0")}-01`)
        .lte("date", `${selectedYear}-${String(m).padStart(2, "0")}-31`);

      const present = (attData || []).filter((a) => ["present", "late"].includes(a.status)).length;
      const total = (attData || []).length;
      attMonthly.push({
        month: `T${m}`,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
        present,
        absent: total - present,
      });
    }
    setMonthlyAttendance(attMonthly);

    // Leave statistics by type
    const leaveTypeMap = new Map<string, number>();
    (leaveRes.data || []).filter((l) => l.status === "approved").forEach((l) => {
      const typeName = (l.leave_type as unknown as { name: string } | null)?.name || "Khác";
      leaveTypeMap.set(typeName, (leaveTypeMap.get(typeName) || 0) + 1);
    });
    setLeaveStats(Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value })));

    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Year filter */}
      <div className="flex items-center gap-3">
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>Năm {y}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng nhân viên" value={summary.totalEmployees} icon={Users} color="blue" />
        <StatCard title="Tổng quỹ lương" value={formatCurrency(summary.totalPayroll)} subtitle={`Năm ${selectedYear}`} icon={DollarSign} color="green" />
        <StatCard title="Nghỉ phép (duyệt)" value={summary.totalLeaves} subtitle={`Năm ${selectedYear}`} icon={CalendarOff} color="yellow" />
        <StatCard title="Lương bình quân" value={summary.totalEmployees > 0 ? formatCurrency(summary.totalPayroll / 12 / summary.totalEmployees) : "—"} subtitle="Tháng/người" icon={TrendingUp} color="purple" />
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Đang tải dữ liệu báo cáo...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly attendance rate */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Tỷ lệ chấm công theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Tỷ lệ"]} />
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Tỷ lệ có mặt" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly salary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Quỹ lương theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlySalary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}tr`} />
                <Tooltip formatter={(v) => [formatCurrency(v as number)]} />
                <Legend />
                <Bar dataKey="gross" fill="#93c5fd" name="Gross" radius={[2, 2, 0, 0]} />
                <Bar dataKey="net" fill="#3b82f6" name="Thực nhận" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Department distribution */}
          {departmentData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-500" /> Nhân viên theo phòng ban
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Nhân viên" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Leave by type */}
          {leaveStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarOff size={16} className="text-yellow-500" /> Nghỉ phép theo loại
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={leaveStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {leaveStats.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {leaveStats.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 flex-1">{item.name}</span>
                      <span className="font-medium text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance breakdown table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Chấm công chi tiết theo tháng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Tháng</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Có mặt</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Vắng</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlyAttendance.filter((m) => m.present + m.absent > 0).map((m) => (
                    <tr key={m.month} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">{m.month}</td>
                      <td className="px-4 py-2 text-green-600">{m.present}</td>
                      <td className="px-4 py-2 text-red-600">{m.absent}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-20">
                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${m.rate}%` }} />
                          </div>
                          <span className="text-gray-600">{m.rate}%</span>
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
