"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  usePayslips,
  useSalaryConfig,
  useUpdatePayslipStatus,
  type PayslipWithEmployee,
} from "@/hooks/use-salary";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, FileText, Calculator, Download, RefreshCw, FileSpreadsheet } from "lucide-react";
import XLSX from "xlsx-js-style";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Employee, Contract } from "@/types/database";

// Biểu thuế lũy tiến từng phần - Luật Thuế TNCN 2026
// Nghị quyết 110/2025/UBTVQH15
const TAX_BRACKETS = [
  { limit: 10_000_000, rate: 0.05 },
  { limit: 30_000_000, rate: 0.10 },
  { limit: 60_000_000, rate: 0.15 },
  { limit: 100_000_000, rate: 0.20 },
  { limit: Infinity, rate: 0.25 },
];

const PERSONAL_DEDUCTION = 15_500_000; // Giảm trừ bản thân
const DEPENDENT_DEDUCTION = 6_200_000; // Giảm trừ mỗi người phụ thuộc

/**
 * Tính thuế TNCN lũy tiến từng phần theo Luật 2026
 */
function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    const bracketWidth = bracket.limit - prevLimit;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    prevLimit = bracket.limit;
    if (remaining <= 0) break;
  }

  return Math.round(tax);
}

const statusMap = {
  draft: { label: "Nháp", variant: "default" as const },
  confirmed: { label: "Đã xác nhận", variant: "info" as const },
  paid: { label: "Đã trả", variant: "success" as const },
};

const yearOptions = [2024, 2025, 2026, 2027].map((y) => ({
  value: String(y),
  label: String(y),
}));

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

export default function SalaryPage() {
  const { employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: "confirmed" | "paid" } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithEmployee | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const { data: payslips = [], isLoading } = usePayslips(
    selectedYear,
    selectedMonth,
    employee?.id,
    isAdmin
  );

  const { data: salaryConfig } = useSalaryConfig();
  const updateStatus = useUpdatePayslipStatus();
  const queryClient = useQueryClient();
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .then(({ data }: { data: Employee[] | null }) => setEmployees(data || []));

      // Lấy hệ số tăng ca từ company_config
      supabase
        .from("company_config")
        .select("overtime_multiplier")
        .maybeSingle()
        .then(({ data }: { data: { overtime_multiplier: number } | null }) => {
          if (data?.overtime_multiplier) setOvertimeMultiplier(data.overtime_multiplier);
        });
    }
  }, [isAdmin]);

  // Auto tính lương khi chọn tháng/năm
  useEffect(() => {
    if (isAdmin && salaryConfig && employees.length > 0) {
      generatePayslips();
    }
  }, [selectedMonth, selectedYear, employees.length, salaryConfig]);

  async function generatePayslips() {
    if (!salaryConfig) {
      toast.error("Chưa cấu hình lương");
      return;
    }
    setIsGenerating(true);
    try {
      const workDays = salaryConfig.standard_work_days;
      const insRate =
        (salaryConfig.social_insurance_rate +
          salaryConfig.health_insurance_rate +
          salaryConfig.unemployment_insurance_rate) /
        100;

      // Lấy tất cả HĐ active kèm ngày bắt đầu
      const { data: activeContracts } = await supabase
        .from("contracts")
        .select("employee_id, base_salary, allowance, attendance_bonus, dependents, start_date")
        .eq("status", "active");

      type ContractRow = {
        employee_id: string;
        base_salary: number;
        allowance: number;
        attendance_bonus: number;
        dependents: number;
        start_date: string;
      };
      const contractMap = new Map<string, ContractRow>(
        (activeContracts || []).map((c: ContractRow) => [c.employee_id, c])
      );

      // Ngày đầu/cuối tháng (đúng cho mọi tháng kể cả tháng 2)
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Chỉ tính cho NV có HĐ active + HĐ bắt đầu trước/trong tháng đang tính
      const eligibleEmployees = employees.filter((emp) => {
        const c = contractMap.get(emp.id);
        if (!c) return false;
        return c.start_date <= monthEnd;
      });

      // Lấy ngày lễ trong tháng (tính như ngày công, NV không cần đi làm)
      const { data: holidaysData } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      // Chỉ đếm ngày lễ rơi vào ngày làm việc (T2-T7, dow 1-6)
      const holidayCount = (holidaysData || []).filter((h: { date: string }) => {
        const dow = new Date(h.date).getDay();
        return dow >= 1 && dow <= 6; // không đếm CN
      }).length;

      const payslipsRaw = await Promise.all(
        eligibleEmployees.map(async (emp) => {
          const contract = contractMap.get(emp.id)!;
          const baseSalary = contract.base_salary;
          const allowance = contract.allowance ?? 0;
          const contractAttendanceBonus = contract.attendance_bonus ?? 0;
          const dependents = contract.dependents ?? 0;

          const { data: attData } = await supabase
            .from("attendance")
            .select("work_hours, overtime_hours, status")
            .eq("employee_id", emp.id)
            .gte("date", monthStart)
            .lte("date", monthEnd);

          const attendanceDays = (attData || []).filter((a: { status: string }) =>
            ["present", "late"].includes(a.status)
          ).length;
          const overtimeHours = (attData || []).reduce(
            (sum: number, a: { overtime_hours: number | null }) => sum + (a.overtime_hours || 0),
            0
          );

          // Đếm ngày nghỉ phép CÓ LƯƠNG (tính như 1 ngày công)
          const { data: paidLeaves } = await supabase
            .from("leaves")
            .select("days, leave_type_id")
            .eq("employee_id", emp.id)
            .eq("status", "approved")
            .gte("start_date", monthStart)
            .lte("end_date", monthEnd);

          const { data: paidTypes } = await supabase
            .from("leave_types")
            .select("id")
            .eq("is_paid", true);
          const paidTypeIds = new Set((paidTypes || []).map((t: { id: string }) => t.id));

          const paidLeaveDays = (paidLeaves || [])
            .filter((l: { leave_type_id: string }) => paidTypeIds.has(l.leave_type_id))
            .reduce((sum: number, l: { days: number }) => sum + l.days, 0);

          // Ngày công = đi làm + nghỉ phép có lương + ngày lễ
          const actualDays = attendanceDays + paidLeaveDays + holidayCount;
          const cappedDays = Math.min(actualDays, workDays);

          // === CÔNG THỨC TÍNH LƯƠNG MỚI (Luật Thuế TNCN 2026) ===

          // Chuyên cần: đi làm đủ ngày (trừ lễ + phép, chỉ tính ngày thực đi làm)
          // Ngày cần đi làm = ngày chuẩn - ngày lễ
          const requiredDays = workDays - holidayCount;
          const attendanceBonus = attendanceDays >= requiredDays ? contractAttendanceBonus : 0;

          // 1. Gross = ((Lương CB + Phụ cấp) / Ngày chuẩn × Ngày thực) + Chuyên cần + Tăng ca
          const dailySalary = (baseSalary + allowance) / workDays;
          const proRataSalary = dailySalary * cappedDays;
          const overtimePay = (baseSalary / (workDays * 8)) * overtimeHours * overtimeMultiplier;
          const grossSalary = proRataSalary + attendanceBonus + overtimePay;

          // 2. Bảo hiểm = Lương CB × (BHXH + BHYT + BHTN)%
          const insuranceAmount = Math.round(baseSalary * insRate);

          // 3. Thu nhập tính thuế = Gross - BH - Giảm trừ cá nhân - Giảm trừ người phụ thuộc
          const totalDeduction = PERSONAL_DEDUCTION + (DEPENDENT_DEDUCTION * dependents);
          const taxableIncome = grossSalary - insuranceAmount - totalDeduction;

          // 4. Thuế TNCN = lũy tiến từng phần
          const taxAmount = calculateProgressiveTax(taxableIncome);

          // 5. Thực nhận = Gross - BH - Thuế
          const netSalary = grossSalary - insuranceAmount - taxAmount;

          return {
            employee_id: emp.id,
            month: selectedMonth,
            year: selectedYear,
            base_salary: baseSalary,
            total_allowances: allowance,
            total_deductions: 0,
            gross_salary: Math.round(grossSalary),
            tax_amount: taxAmount,
            insurance_amount: insuranceAmount,
            net_salary: Math.max(0, Math.round(netSalary)),
            work_days: workDays,
            actual_work_days: cappedDays,
            overtime_hours: overtimeHours,
            overtime_pay: Math.round(overtimePay),
            attendance_bonus: attendanceBonus,
            status: "draft" as const,
            breakdown: {
              allowance,
              attendanceBonus,
              dependents,
              proRataSalary: Math.round(proRataSalary),
              overtimePay: Math.round(overtimePay),
              insuranceAmount,
              personalDeduction: PERSONAL_DEDUCTION,
              dependentDeduction: DEPENDENT_DEDUCTION * dependents,
              taxableIncome: Math.max(0, Math.round(taxableIncome)),
              taxAmount,
            },
          };
        })
      );

      const payslipsData = payslipsRaw.filter(Boolean);

      // Lấy payslip hiện tại để biết cái nào đã confirmed/paid → không ghi đè
      const { data: existingPayslips } = await supabase
        .from("payslips")
        .select("employee_id, status")
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      const lockedIds = new Set(
        (existingPayslips || [])
          .filter((p: { status: string }) => p.status !== "draft")
          .map((p: { employee_id: string }) => p.employee_id)
      );

      // Chỉ upsert payslip draft hoặc mới (bỏ qua confirmed/paid)
      const draftPayslips = payslipsData.filter(
        (p) => p && !lockedIds.has(p.employee_id)
      );

      // Xoá payslip DRAFT của NV không còn đủ điều kiện
      const eligibleIds = new Set(eligibleEmployees.map((e) => e.id));
      const ineligibleIds = employees
        .filter((e) => !eligibleIds.has(e.id))
        .map((e) => e.id);
      if (ineligibleIds.length > 0) {
        await supabase
          .from("payslips")
          .delete()
          .in("employee_id", ineligibleIds)
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .eq("status", "draft"); // chỉ xoá draft
      }

      if (draftPayslips.length > 0) {
        const { error } = await supabase.from("payslips").upsert(draftPayslips, {
          onConflict: "employee_id,month,year",
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["payslips"] });
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi tính lương");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleStatusUpdate() {
    if (!confirmAction) return;
    updateStatus.mutate(
      { id: confirmAction.id, status: confirmAction.status },
      {
        onSuccess: () => { toast.success("Cập nhật trạng thái thành công"); setConfirmAction(null); },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function n(v: number) { return Math.round(v); }

  // Style helpers
  const hdrStyle = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center" as const, vertical: "center" as const }, border: { bottom: { style: "thin" as const, color: { rgb: "1E40AF" } } } };
  const bodyStyle = { font: { sz: 10 }, alignment: { vertical: "center" as const }, border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } } };
  const moneyStyle = { ...bodyStyle, alignment: { ...bodyStyle.alignment, horizontal: "right" as const }, numFmt: "#,##0" };
  const totalStyle = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "F0FDF4" } }, alignment: { vertical: "center" as const }, border: { top: { style: "medium" as const, color: { rgb: "16A34A" } }, bottom: { style: "medium" as const, color: { rgb: "16A34A" } } } };
  const totalMoneyStyle = { ...totalStyle, alignment: { ...totalStyle.alignment, horizontal: "right" as const }, numFmt: "#,##0" };

  function exportAllXLSX() {
    if (payslips.length === 0) return;

    const headers = ["STT", "Mã NV", "Họ tên", "Ngày công", "Lương CB", "Phụ cấp", "Chuyên cần", "Tăng ca (h)", "Tiền tăng ca", "Gross", "Bảo hiểm", "Thuế TNCN", "Thực nhận", "Trạng thái"];

    // Title row
    const titleRow = [{ v: `BẢNG LƯƠNG THÁNG ${selectedMonth}/${selectedYear}`, s: { font: { bold: true, sz: 14, color: { rgb: "1E40AF" } }, alignment: { horizontal: "center" } } }];

    // Header
    const hdrRow = headers.map((h) => ({ v: h, s: hdrStyle }));

    // Data rows
    const dataRows = payslips.map((p, i) => [
      { v: i + 1, s: { ...bodyStyle, alignment: { horizontal: "center" as const, vertical: "center" as const } } },
      { v: p.employee?.employee_code || "", s: { ...bodyStyle, font: { sz: 10, name: "Consolas" } } },
      { v: p.employee?.full_name || "", s: { ...bodyStyle, font: { sz: 10, bold: true } } },
      { v: `${p.actual_work_days}/${p.work_days}`, s: { ...bodyStyle, alignment: { horizontal: "center" as const, vertical: "center" as const } } },
      { v: n(p.base_salary), t: "n", s: moneyStyle },
      { v: n(p.total_allowances), t: "n", s: moneyStyle },
      { v: n(p.attendance_bonus || 0), t: "n", s: moneyStyle },
      { v: p.overtime_hours, t: "n", s: { ...bodyStyle, alignment: { horizontal: "center" as const, vertical: "center" as const } } },
      { v: n(p.overtime_pay), t: "n", s: moneyStyle },
      { v: n(p.gross_salary), t: "n", s: { ...moneyStyle, font: { sz: 10, bold: true } } },
      { v: n(p.insurance_amount), t: "n", s: { ...moneyStyle, font: { sz: 10, color: { rgb: "DC2626" } } } },
      { v: n(p.tax_amount), t: "n", s: { ...moneyStyle, font: { sz: 10, color: { rgb: "DC2626" } } } },
      { v: n(p.net_salary), t: "n", s: { ...moneyStyle, font: { sz: 11, bold: true, color: { rgb: "16A34A" } } } },
      { v: statusMap[p.status]?.label || p.status, s: { ...bodyStyle, alignment: { horizontal: "center" as const, vertical: "center" as const } } },
    ]);

    // Total row
    const sumCol = (idx: number) => dataRows.reduce((s, r) => s + ((r[idx]?.v as number) || 0), 0);
    const totalRow = [
      { v: "", s: totalStyle },
      { v: "", s: totalStyle },
      { v: "TỔNG CỘNG", s: totalStyle },
      { v: "", s: totalStyle },
      { v: sumCol(4), t: "n", s: totalMoneyStyle },
      { v: sumCol(5), t: "n", s: totalMoneyStyle },
      { v: sumCol(6), t: "n", s: totalMoneyStyle },
      { v: sumCol(7), t: "n", s: { ...totalStyle, alignment: { horizontal: "center" as const } } },
      { v: sumCol(8), t: "n", s: totalMoneyStyle },
      { v: sumCol(9), t: "n", s: { ...totalMoneyStyle, font: { bold: true, sz: 11 } } },
      { v: sumCol(10), t: "n", s: totalMoneyStyle },
      { v: sumCol(11), t: "n", s: totalMoneyStyle },
      { v: sumCol(12), t: "n", s: { ...totalMoneyStyle, font: { bold: true, sz: 12, color: { rgb: "16A34A" } } } },
      { v: "", s: totalStyle },
    ];

    const aoa = [titleRow, [], hdrRow, ...dataRows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge title row
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];

    // Column widths
    ws["!cols"] = [
      { wch: 5 }, { wch: 10 }, { wch: 26 }, { wch: 10 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 12 },
    ];
    ws["!rows"] = [{ hpt: 30 }, { hpt: 8 }, { hpt: 24 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `T${selectedMonth}-${selectedYear}`);
    XLSX.writeFile(wb, `bang-luong-T${selectedMonth}-${selectedYear}.xlsx`);
  }

  function exportPayslipXLSX(p: PayslipWithEmployee) {
    const bd = (p.breakdown || {}) as Record<string, number>;
    const lblStyle = { font: { sz: 10, color: { rgb: "6B7280" } }, border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } } };
    const valStyle = { font: { sz: 10, bold: true }, alignment: { horizontal: "right" as const }, numFmt: "#,##0", border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } } };
    const secStyle = { font: { sz: 10, bold: true, color: { rgb: "2563EB" } }, fill: { fgColor: { rgb: "EFF6FF" } } };
    const netStyle = { font: { sz: 13, bold: true, color: { rgb: "16A34A" } }, alignment: { horizontal: "right" as const }, numFmt: "#,##0", fill: { fgColor: { rgb: "F0FDF4" } }, border: { top: { style: "medium" as const, color: { rgb: "16A34A" } } } };

    const row = (label: string, val: number | string, isSection = false) => {
      if (isSection) return [{ v: label, s: secStyle }, { v: "", s: secStyle }];
      return [{ v: label, s: lblStyle }, typeof val === "number" ? { v: val, t: "n", s: valStyle } : { v: val, s: { ...valStyle, numFmt: undefined } }];
    };

    const aoa = [
      [{ v: `PHIẾU LƯƠNG THÁNG ${p.month}/${p.year}`, s: { font: { bold: true, sz: 14, color: { rgb: "1E40AF" } }, alignment: { horizontal: "center" } } }],
      [],
      row("Nhân viên", p.employee?.full_name || ""),
      row("Mã NV", p.employee?.employee_code || ""),
      row("Ngày công", `${p.actual_work_days}/${p.work_days}`),
      [],
      row("THU NHẬP", 0, true),
      row("Lương cơ bản", n(p.base_salary)),
      row("Phụ cấp", n(p.total_allowances)),
      row("Lương theo ngày công", n(bd.proRataSalary || 0)),
      row("Chuyên cần", n(p.attendance_bonus || 0)),
      row(`Tăng ca (${p.overtime_hours}h)`, n(p.overtime_pay)),
      row("Tổng Gross", n(p.gross_salary)),
      [],
      row("KHẤU TRỪ", 0, true),
      row("Bảo hiểm (BHXH+BHYT+BHTN)", n(p.insurance_amount)),
      row("Giảm trừ bản thân", n(PERSONAL_DEDUCTION)),
      row(`Giảm trừ người phụ thuộc (${bd.dependents || 0})`, n(bd.dependentDeduction || 0)),
      row("Thu nhập tính thuế", n(bd.taxableIncome || 0)),
      row("Thuế TNCN (lũy tiến)", n(p.tax_amount)),
      [],
      [{ v: "THỰC NHẬN", s: { ...netStyle, alignment: { horizontal: "left" as const }, font: { sz: 13, bold: true, color: { rgb: "16A34A" } } } }, { v: n(p.net_salary), t: "n", s: netStyle }],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    ws["!cols"] = [{ wch: 32 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Phieu luong");
    XLSX.writeFile(wb, `phieu-luong-${p.employee?.employee_code}-T${p.month}-${p.year}.xlsx`);
  }

  const totalNet = useMemo(
    () => payslips.reduce((s, p) => s + p.net_salary, 0),
    [payslips]
  );

  const columns = useMemo(() => {
    const cols: Column<PayslipWithEmployee>[] = [];

    if (isAdmin) {
      cols.push({
        header: "Nhân viên",
        cell: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.employee?.full_name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {row.employee?.employee_code}
            </p>
          </div>
        ),
      });
    }

    cols.push(
      {
        header: "Ngày công",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.actual_work_days}/{row.work_days}
          </span>
        ),
      },
      {
        header: "Lương cơ bản",
        cell: (row) => (
          <span className="text-foreground">{formatCurrency(row.base_salary)}</span>
        ),
      },
      {
        header: "Phụ cấp",
        cell: (row) => (
          <span className="text-green-600 dark:text-green-400">
            {formatCurrency(row.total_allowances)}
          </span>
        ),
      },
      {
        header: "Chuyên cần",
        cell: (row) => (
          <span className={row.attendance_bonus > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
            {formatCurrency(row.attendance_bonus || 0)}
          </span>
        ),
      },
      {
        header: "Gross",
        cell: (row) => (
          <span className="text-foreground">{formatCurrency(row.gross_salary)}</span>
        ),
      },
      {
        header: "Khấu trừ",
        cell: (row) => (
          <span className="text-red-600 dark:text-red-400">
            -{formatCurrency(row.insurance_amount + row.tax_amount + row.total_deductions)}
          </span>
        ),
      },
      {
        header: "Thực nhận",
        cell: (row) => (
          <span className="font-bold text-primary">
            {formatCurrency(row.net_salary)}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        cell: (row) => (
          <Badge variant={statusMap[row.status]?.variant}>
            {statusMap[row.status]?.label}
          </Badge>
        ),
      },
      {
        header: "Thao tác",
        cell: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedPayslip(row);
                setDetailOpen(true);
              }}
              className="p-1.5 hover:bg-accent rounded text-blue-500 dark:text-blue-400 transition"
              title="Chi tiết"
            >
              <FileText size={14} />
            </button>
            <button
              onClick={() => exportPayslipXLSX(row)}
              className="p-1.5 hover:bg-accent rounded text-muted-foreground transition"
              title="Xuất phiếu lương"
            >
              <Download size={14} />
            </button>
            {isAdmin && row.status === "draft" && (
              <button
                onClick={() => setConfirmAction({ id: row.id, status: "confirmed" })}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1"
              >
                Xác nhận
              </button>
            )}
            {isAdmin && row.status === "confirmed" && (
              <button
                onClick={() => setConfirmAction({ id: row.id, status: "paid" })}
                className="text-xs text-green-600 dark:text-green-400 hover:underline px-1"
              >
                Đã trả
              </button>
            )}
          </div>
        ),
      }
    );

    return cols;
  }, [isAdmin]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-card rounded-xl ring-1 ring-border p-4 flex flex-wrap items-center gap-3">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
          options={yearOptions}
          className="w-28"
        />
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(Number(v))}
          options={monthOptions}
          className="w-36"
        />
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={generatePayslips}
            disabled={isGenerating}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            title="Tính lại lương"
          >
            <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* Payslips table */}
      <div className="ring-1 ring-border rounded-xl overflow-hidden">
        <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Bảng lương Tháng {selectedMonth}/{selectedYear}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {payslips.length} phiếu lương
            </span>
            {payslips.length > 0 && (
              <button
                onClick={exportAllXLSX}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition"
              >
                <FileSpreadsheet size={14} /> Xuất Excel
              </button>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={payslips}
          isLoading={isLoading}
          emptyState={{
            icon: DollarSign,
            title: "Chưa có phiếu lương",
            description: isAdmin
              ? "Nhấn 'Tính lương' để tạo phiếu lương cho tháng này"
              : "Phiếu lương tháng này chưa được tạo",
          }}
          className="rounded-none ring-0"
        />
        {payslips.length > 0 && (
          <div className="bg-muted border-t border-border px-4 py-3 flex items-center justify-between">
            {isAdmin && (
              <span className="font-semibold text-foreground">Tổng cộng</span>
            )}
            <span className="font-bold text-primary ml-auto">
              {formatCurrency(totalNet)}
            </span>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedPayslip && (() => {
        const breakdown = (selectedPayslip.breakdown || {}) as Record<string, unknown>;
        return (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Chi tiết phiếu lương"
          size="md"
        >
          <div className="space-y-4">
            <div className="text-center pb-3 border-b border-border">
              <p className="font-bold text-lg text-foreground">
                {selectedPayslip.employee?.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Tháng {selectedPayslip.month}/{selectedPayslip.year}
              </p>
              <Badge
                variant={statusMap[selectedPayslip.status]?.variant}
                className="mt-1"
              >
                {statusMap[selectedPayslip.status]?.label}
              </Badge>
            </div>
            <div className="space-y-2">
              {/* --- THU NHẬP --- */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thu nhập</p>
              <Row label="Lương cơ bản" value={formatCurrency(selectedPayslip.base_salary)} />
              {selectedPayslip.total_allowances > 0 && (
                <Row label="Phụ cấp" value={formatCurrency(selectedPayslip.total_allowances)} />
              )}
              <Row
                label={`Ngày công (${selectedPayslip.actual_work_days}/${selectedPayslip.work_days})`}
                value={formatCurrency(
                  ((selectedPayslip.base_salary + selectedPayslip.total_allowances) / selectedPayslip.work_days) *
                    selectedPayslip.actual_work_days
                )}
              />
              {(selectedPayslip.attendance_bonus || 0) > 0 && (
                <Row
                  label="Chuyên cần"
                  value={formatCurrency(selectedPayslip.attendance_bonus || 0)}
                  className="text-green-600 dark:text-green-400"
                />
              )}
              {selectedPayslip.overtime_hours > 0 && (
                <Row
                  label={`Tăng ca (${selectedPayslip.overtime_hours}h)`}
                  value={formatCurrency(selectedPayslip.overtime_pay)}
                />
              )}
              <Row
                label="Tổng Gross"
                value={formatCurrency(selectedPayslip.gross_salary)}
                className="font-semibold border-t border-border pt-2"
              />

              {/* --- KHẤU TRỪ --- */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Khấu trừ</p>
              <Row
                label={`Bảo hiểm (${((salaryConfig?.social_insurance_rate ?? 8) + (salaryConfig?.health_insurance_rate ?? 1.5) + (salaryConfig?.unemployment_insurance_rate ?? 1))}%)`}
                value={`-${formatCurrency(selectedPayslip.insurance_amount)}`}
                className="text-red-600 dark:text-red-400"
              />

              {/* Giảm trừ gia cảnh */}
              <Row
                label="Giảm trừ bản thân"
                value={formatCurrency(PERSONAL_DEDUCTION)}
                className="text-muted-foreground text-xs"
              />
              {(Number(breakdown?.dependents) || 0) > 0 && (
                <Row
                  label={`Giảm trừ ${breakdown.dependents} người phụ thuộc`}
                  value={formatCurrency(DEPENDENT_DEDUCTION * Number(breakdown.dependents))}
                  className="text-muted-foreground text-xs"
                />
              )}
              <Row
                label="Thu nhập tính thuế"
                value={formatCurrency(Math.max(0, breakdown?.taxableIncome as number ?? 0))}
                className="text-xs"
              />
              <Row
                label="Thuế TNCN (lũy tiến)"
                value={`-${formatCurrency(selectedPayslip.tax_amount)}`}
                className="text-red-600 dark:text-red-400"
              />

              {/* --- THỰC NHẬN --- */}
              <Row
                label="THỰC NHẬN"
                value={formatCurrency(selectedPayslip.net_salary)}
                className="font-bold text-primary text-base border-t border-border pt-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                leftIcon={<Download size={14} />}
                onClick={() => exportPayslipXLSX(selectedPayslip)}
                size="sm"
              >
                Xuất Excel
              </Button>
            </div>
          </div>
        </Modal>
        );
      })()}

      {/* Confirm status update */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.status === "confirmed" ? "Xác nhận phiếu lương?" : "Thanh toán phiếu lương?"}
        description={confirmAction?.status === "confirmed" ? "Phiếu lương sẽ chuyển sang trạng thái đã xác nhận." : "Xác nhận đã thanh toán phiếu lương này?"}
        confirmText={confirmAction?.status === "confirmed" ? "Xác nhận" : "Thanh toán"}
        onConfirm={handleStatusUpdate}
        loading={updateStatus.isPending}
      />

    </div>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
