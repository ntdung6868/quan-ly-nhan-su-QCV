"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  usePayslips,
  useSalaryConfig,
  useUpdatePayslipStatus,
  type PayslipWithEmployee,
} from "@/hooks/use-salary";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, FileText, Calculator, Download } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/types/database";

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

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .gt("base_salary", 0)
        .then(({ data }: { data: Employee[] | null }) => setEmployees(data || []));
    }
  }, [isAdmin]);

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

      const payslipsData = await Promise.all(
        employees.map(async (emp) => {
          const { data: attData } = await supabase
            .from("attendance")
            .select("work_hours, overtime_hours, status")
            .eq("employee_id", emp.id)
            .gte(
              "date",
              `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
            )
            .lte(
              "date",
              `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`
            );

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
            .gte("start_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)
            .lte("end_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`);

          // Lấy danh sách leave_type có is_paid = true
          const { data: paidTypes } = await supabase
            .from("leave_types")
            .select("id")
            .eq("is_paid", true);
          const paidTypeIds = new Set((paidTypes || []).map((t: { id: string }) => t.id));

          const paidLeaveDays = (paidLeaves || [])
            .filter((l: { leave_type_id: string }) => paidTypeIds.has(l.leave_type_id))
            .reduce((sum: number, l: { days: number }) => sum + l.days, 0);

          // Ngày công = đi làm thực tế + nghỉ phép có lương
          const actualDays = attendanceDays + paidLeaveDays;

          const { data: allowancesData } = await supabase
            .from("employee_allowances")
            .select("amount")
            .eq("employee_id", emp.id);
          const { data: deductionsData } = await supabase
            .from("employee_deductions")
            .select("amount, percentage")
            .eq("employee_id", emp.id);

          const totalAllowances = (allowancesData || []).reduce(
            (s: number, a: { amount: number }) => s + a.amount,
            0
          );
          const baseSalary = emp.base_salary;
          const dailySalary = baseSalary / workDays;
          const cappedDays = Math.min(actualDays, workDays);
          const actualBaseSalary = dailySalary * cappedDays;
          const overtimePay =
            (baseSalary / (workDays * 8)) * overtimeHours * 1.5;

          const totalDeductions = (deductionsData || []).reduce((s: number, d: { percentage?: number; amount?: number }) => {
            if (d.percentage) return s + baseSalary * (d.percentage / 100);
            return s + (d.amount || 0);
          }, 0);

          const insuranceAmount = baseSalary * insRate;
          const grossSalary = actualBaseSalary + totalAllowances + overtimePay;
          const taxableIncome =
            grossSalary - insuranceAmount - salaryConfig.tax_threshold;
          const taxAmount =
            taxableIncome > 0
              ? taxableIncome * (salaryConfig.personal_income_tax_rate / 100)
              : 0;
          const netSalary =
            grossSalary - insuranceAmount - taxAmount - totalDeductions;

          return {
            employee_id: emp.id,
            month: selectedMonth,
            year: selectedYear,
            base_salary: baseSalary,
            total_allowances: totalAllowances,
            total_deductions: totalDeductions,
            gross_salary: grossSalary,
            tax_amount: Math.max(0, taxAmount),
            insurance_amount: insuranceAmount,
            net_salary: Math.max(0, netSalary),
            work_days: workDays,
            actual_work_days: cappedDays,
            overtime_hours: overtimeHours,
            overtime_pay: overtimePay,
            status: "draft" as const,
            breakdown: {
              actualBaseSalary,
              overtimePay,
              insuranceAmount,
              taxAmount,
            },
          };
        })
      );

      const { error } = await supabase.from("payslips").upsert(payslipsData, {
        onConflict: "employee_id,month,year",
      });
      if (error) throw error;
      toast.success(`Đã tính lương cho ${payslipsData.length} nhân viên`);
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

  function exportPDF(payslip: PayslipWithEmployee) {
    const content = `
PHIẾU LƯƠNG THÁNG ${payslip.month}/${payslip.year}
===================================
Nhân viên: ${payslip.employee?.full_name}
Mã NV: ${payslip.employee?.employee_code}

DOANH THU:
- Lương cơ bản: ${formatCurrency(payslip.base_salary)}
- Phụ cấp: ${formatCurrency(payslip.total_allowances)}
- Tăng ca: ${formatCurrency(payslip.overtime_pay)}
- Tổng gross: ${formatCurrency(payslip.gross_salary)}

KHẤU TRỪ:
- Bảo hiểm: ${formatCurrency(payslip.insurance_amount)}
- Thuế TNCN: ${formatCurrency(payslip.tax_amount)}
- Khấu trừ khác: ${formatCurrency(payslip.total_deductions)}

THỰC NHẬN: ${formatCurrency(payslip.net_salary)}
    `;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phieu-luong-${payslip.employee?.employee_code}-${payslip.month}-${payslip.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
              onClick={() => exportPDF(row)}
              className="p-1.5 hover:bg-accent rounded text-muted-foreground transition"
              title="Xuất"
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
          <Button
            onClick={generatePayslips}
            loading={isGenerating}
            leftIcon={<Calculator size={14} />}
            size="sm"
          >
            Tính lương tháng {selectedMonth}/{selectedYear}
          </Button>
        )}
      </div>

      {/* Payslips table */}
      <div className="ring-1 ring-border rounded-xl overflow-hidden">
        <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Bảng lương Tháng {selectedMonth}/{selectedYear}
          </h3>
          <span className="text-sm text-muted-foreground">
            {payslips.length} phiếu lương
          </span>
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
      {selectedPayslip && (
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
              <Row label="Lương cơ bản" value={formatCurrency(selectedPayslip.base_salary)} />
              <Row
                label={`Ngày công (${selectedPayslip.actual_work_days}/${selectedPayslip.work_days})`}
                value={formatCurrency(
                  (selectedPayslip.base_salary / selectedPayslip.work_days) *
                    selectedPayslip.actual_work_days
                )}
              />
              {selectedPayslip.overtime_hours > 0 && (
                <Row
                  label={`Tăng ca (${selectedPayslip.overtime_hours}h)`}
                  value={formatCurrency(selectedPayslip.overtime_pay)}
                />
              )}
              <Row
                label="Phụ cấp"
                value={formatCurrency(selectedPayslip.total_allowances)}
              />
              <Row
                label="Gross"
                value={formatCurrency(selectedPayslip.gross_salary)}
                className="font-semibold border-t border-border pt-2"
              />
              <Row
                label="Bảo hiểm"
                value={`-${formatCurrency(selectedPayslip.insurance_amount)}`}
                className="text-red-600 dark:text-red-400"
              />
              <Row
                label="Thuế TNCN"
                value={`-${formatCurrency(selectedPayslip.tax_amount)}`}
                className="text-red-600 dark:text-red-400"
              />
              {selectedPayslip.total_deductions > 0 && (
                <Row
                  label="Khấu trừ khác"
                  value={`-${formatCurrency(selectedPayslip.total_deductions)}`}
                  className="text-red-600 dark:text-red-400"
                />
              )}
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
                onClick={() => exportPDF(selectedPayslip)}
                size="sm"
              >
                Xuất file
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
