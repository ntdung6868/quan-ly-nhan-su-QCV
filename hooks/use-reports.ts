"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface MonthlyAttendance {
  month: string;
  rate: number;
  present: number;
  absent: number;
}

interface DepartmentData {
  name: string;
  count: number;
}

interface MonthlySalary {
  month: string;
  gross: number;
  net: number;
}

interface LeaveStats {
  name: string;
  value: number;
}

interface ReportData {
  summary: {
    totalEmployees: number;
    totalPayroll: number;
    monthsWithPayroll: number;
    avgAttendanceRate: number;
    totalLeaves: number;
  };
  monthlyAttendance: MonthlyAttendance[];
  departmentData: DepartmentData[];
  monthlySalary: MonthlySalary[];
  leaveStats: LeaveStats[];
}

/**
 * PERFORMANCE FIX: Replaces the old pattern that made 12 sequential Supabase
 * queries (one per month) for attendance data. Now fetches ALL attendance for
 * the entire year in ONE query and groups by month client-side.
 */
export function useReportData(year: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["reports", year],
    queryFn: async (): Promise<ReportData> => {
      // Fetch ALL data in parallel -- one round trip each
      const [empRes, payslipRes, leaveRes, deptRes, attRes] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, department_id")
            .eq("status", "active")
            .gt("base_salary", 0),
          supabase
            .from("payslips")
            .select("month, year, gross_salary, net_salary")
            .eq("year", year),
          supabase
            .from("leaves")
            .select("status, leave_type:leave_types(name)")
            .gte("start_date", `${year}-01-01`)
            .lte("end_date", `${year}-12-31`),
          supabase.from("departments").select("id, name"),
          // CRITICAL: Fetch ALL attendance for the year in ONE query
          supabase
            .from("attendance")
            .select("date, status")
            .gte("date", `${year}-01-01`)
            .lte("date", `${year}-12-31`),
        ]);

      if (empRes.error) throw empRes.error;
      if (payslipRes.error) throw payslipRes.error;
      if (leaveRes.error) throw leaveRes.error;
      if (deptRes.error) throw deptRes.error;
      if (attRes.error) throw attRes.error;

      const employees = empRes.data || [];
      const payslips = payslipRes.data || [];
      const leaves = leaveRes.data || [];
      const departments = deptRes.data || [];
      const allAttendance = attRes.data || [];

      // --- Summary ---
      const totalEmployees = employees.length;
      const totalPayroll = payslips.reduce((s: number, p: { net_salary: number }) => s + p.net_salary, 0);
      const monthsWithPayroll = new Set(payslips.map((p: { month: number }) => p.month)).size;
      const totalLeaves = leaves.filter(
        (l: { status: string }) => l.status === "approved"
      ).length;

      // --- Monthly attendance: group by month client-side ---
      const attByMonth = new Map<
        number,
        { present: number; total: number }
      >();
      for (const att of allAttendance) {
        const month = parseInt(att.date.split("-")[1], 10);
        const entry = attByMonth.get(month) || { present: 0, total: 0 };
        entry.total++;
        if (att.status === "present" || att.status === "late") {
          entry.present++;
        }
        attByMonth.set(month, entry);
      }

      let totalAttRate = 0;
      let monthsWithData = 0;
      const monthlyAttendance: MonthlyAttendance[] = Array.from(
        { length: 12 },
        (_, i) => {
          const m = i + 1;
          const data = attByMonth.get(m) || { present: 0, total: 0 };
          const rate =
            data.total > 0
              ? Math.round((data.present / data.total) * 100)
              : 0;
          if (data.total > 0) {
            totalAttRate += rate;
            monthsWithData++;
          }
          return {
            month: `T${m}`,
            rate,
            present: data.present,
            absent: data.total - data.present,
          };
        }
      );

      const avgAttendanceRate =
        monthsWithData > 0 ? Math.round(totalAttRate / monthsWithData) : 0;

      // --- Monthly salary ---
      const monthlyMap = new Map<number, { gross: number; net: number }>();
      payslips.forEach((p: { month: number; gross_salary: number; net_salary: number }) => {
        const existing = monthlyMap.get(p.month) || { gross: 0, net: 0 };
        monthlyMap.set(p.month, {
          gross: existing.gross + p.gross_salary,
          net: existing.net + p.net_salary,
        });
      });
      const monthlySalary: MonthlySalary[] = Array.from(
        { length: 12 },
        (_, i) => {
          const data = monthlyMap.get(i + 1) || { gross: 0, net: 0 };
          return { month: `T${i + 1}`, gross: data.gross, net: data.net };
        }
      );

      // --- Department distribution ---
      const deptMap = new Map<string, number>();
      employees.forEach((e: { department_id?: string }) => {
        if (e.department_id) {
          deptMap.set(
            e.department_id,
            (deptMap.get(e.department_id) || 0) + 1
          );
        }
      });
      const departmentData: DepartmentData[] = departments
        .map((d: { id: string; name: string }) => ({
          name: d.name,
          count: deptMap.get(d.id) || 0,
        }))
        .filter((d: { count: number }) => d.count > 0);

      // --- Leave statistics by type ---
      const leaveTypeMap = new Map<string, number>();
      leaves
        .filter((l: { status: string }) => l.status === "approved")
        .forEach((l: { status: string; leave_type: unknown }) => {
          const typeName =
            (l.leave_type as unknown as { name: string } | null)?.name ||
            "Khác";
          leaveTypeMap.set(typeName, (leaveTypeMap.get(typeName) || 0) + 1);
        });
      const leaveStats: LeaveStats[] = Array.from(
        leaveTypeMap.entries()
      ).map(([name, value]) => ({ name, value }));

      return {
        summary: {
          totalEmployees,
          totalPayroll,
          monthsWithPayroll,
          avgAttendanceRate,
          totalLeaves,
        },
        monthlyAttendance,
        departmentData,
        monthlySalary,
        leaveStats,
      };
    },
  });
}
