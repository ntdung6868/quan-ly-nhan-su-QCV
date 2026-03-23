"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, FileText, Calculator, Download } from "lucide-react";
import { toast } from "sonner";
import type { Payslip, Employee, SalaryConfig } from "@/types/database";

type PayslipWithEmployee = Payslip & { employee?: { full_name: string; employee_code: string } };

const statusMap = {
  draft: { label: "Nháp", variant: "default" as const },
  confirmed: { label: "Đã xác nhận", variant: "info" as const },
  paid: { label: "Đã trả", variant: "success" as const },
};

export default function SalaryPage() {
  const { employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [payslips, setPayslips] = useState<PayslipWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithEmployee | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => { loadData(); }, [employee?.id, selectedYear, selectedMonth, isAdmin]);

  async function loadData() {
    if (!employee?.id) return;
    setIsLoading(true);
    const [configRes, slipRes] = await Promise.all([
      isAdmin ? supabase.from("salary_config").select("*").single() : Promise.resolve({ data: null }),
      (() => {
        let q = supabase.from("payslips")
          .select("*, employee:employees(full_name,employee_code)")
          .eq("year", selectedYear)
          .eq("month", selectedMonth);
        if (!isAdmin) q = q.eq("employee_id", employee.id);
        return q;
      })(),
    ]);
    setSalaryConfig(configRes.data);
    setPayslips(slipRes.data || []);

    if (isAdmin) {
      const { data } = await supabase.from("employees").select("*").eq("status", "active");
      setEmployees(data || []);
    }
    setIsLoading(false);
  }

  async function generatePayslips() {
    if (!salaryConfig) { toast.error("Chưa cấu hình lương"); return; }
    setIsGenerating(true);
    try {
      const workDays = salaryConfig.standard_work_days;
      const insRate = (salaryConfig.social_insurance_rate + salaryConfig.health_insurance_rate + salaryConfig.unemployment_insurance_rate) / 100;

      const payslipsData = await Promise.all(
        employees.map(async (emp) => {
          const { data: attData } = await supabase.from("attendance")
            .select("work_hours, overtime_hours, status")
            .eq("employee_id", emp.id)
            .gte("date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)
            .lte("date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`);

          const actualDays = (attData || []).filter((a) => ["present", "late"].includes(a.status)).length;
          const overtimeHours = (attData || []).reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

          const { data: allowancesData } = await supabase.from("employee_allowances")
            .select("amount").eq("employee_id", emp.id);
          const { data: deductionsData } = await supabase.from("employee_deductions")
            .select("amount, percentage").eq("employee_id", emp.id);

          const totalAllowances = (allowancesData || []).reduce((s, a) => s + a.amount, 0);
          const baseSalary = emp.base_salary;
          const dailySalary = baseSalary / workDays;
          const actualBaseSalary = dailySalary * actualDays;
          const overtimePay = (baseSalary / (workDays * 8)) * overtimeHours * 1.5;

          const totalDeductions = (deductionsData || []).reduce((s, d) => {
            if (d.percentage) return s + baseSalary * (d.percentage / 100);
            return s + (d.amount || 0);
          }, 0);

          const insuranceAmount = baseSalary * insRate;
          const grossSalary = actualBaseSalary + totalAllowances + overtimePay;
          const taxableIncome = grossSalary - insuranceAmount - salaryConfig.tax_threshold;
          const taxAmount = taxableIncome > 0 ? taxableIncome * (salaryConfig.personal_income_tax_rate / 100) : 0;
          const netSalary = grossSalary - insuranceAmount - taxAmount - totalDeductions;

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
            actual_work_days: actualDays,
            overtime_hours: overtimeHours,
            overtime_pay: overtimePay,
            status: "draft" as const,
            breakdown: { actualBaseSalary, overtimePay, insuranceAmount, taxAmount },
          };
        })
      );

      const { error } = await supabase.from("payslips").upsert(payslipsData, {
        onConflict: "employee_id,month,year",
      });
      if (error) throw error;
      toast.success(`Đã tính lương cho ${payslipsData.length} nhân viên`);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi tính lương");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateStatus(id: string, status: Payslip["status"]) {
    const update: Partial<Payslip> = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    await supabase.from("payslips").update(update).eq("id", id);
    toast.success(`Cập nhật trạng thái thành công`);
    loadData();
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

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {months.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <div className="flex-1" />
        {isAdmin && (
          <Button onClick={generatePayslips} loading={isGenerating} leftIcon={<Calculator size={14} />} size="sm">
            Tính lương tháng {selectedMonth}/{selectedYear}
          </Button>
        )}
      </div>

      {/* Payslips table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Bảng lương Tháng {selectedMonth}/{selectedYear}
          </h3>
          <span className="text-sm text-gray-500">{payslips.length} phiếu lương</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : payslips.length === 0 ? (
          <EmptyState icon={DollarSign} title="Chưa có phiếu lương"
            description={isAdmin ? "Nhấn 'Tính lương' để tạo phiếu lương cho tháng này" : "Phiếu lương tháng này chưa được tạo"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {isAdmin && <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày công</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Lương cơ bản</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Phụ cấp</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Gross</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Khấu trừ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium font-bold">Thực nhận</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-gray-50 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{ps.employee?.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{ps.employee?.employee_code}</p>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">{ps.actual_work_days}/{ps.work_days}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(ps.base_salary)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(ps.total_allowances)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(ps.gross_salary)}</td>
                    <td className="px-4 py-3 text-red-600">
                      -{formatCurrency(ps.insurance_amount + ps.tax_amount + ps.total_deductions)}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700">{formatCurrency(ps.net_salary)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[ps.status]?.variant}>{statusMap[ps.status]?.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedPayslip(ps); setDetailOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition" title="Chi tiết">
                          <FileText size={14} />
                        </button>
                        <button onClick={() => exportPDF(ps)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition" title="Xuất">
                          <Download size={14} />
                        </button>
                        {isAdmin && ps.status === "draft" && (
                          <button onClick={() => updateStatus(ps.id, "confirmed")}
                            className="text-xs text-blue-600 hover:underline px-1">Xác nhận</button>
                        )}
                        {isAdmin && ps.status === "confirmed" && (
                          <button onClick={() => updateStatus(ps.id, "paid")}
                            className="text-xs text-green-600 hover:underline px-1">Đã trả</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  {isAdmin && <td className="px-4 py-3 font-semibold text-gray-700">Tổng cộng</td>}
                  <td colSpan={5} className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold text-blue-700">
                    {formatCurrency(payslips.reduce((s, p) => s + p.net_salary, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedPayslip && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết phiếu lương" size="md">
          <div className="space-y-4">
            <div className="text-center pb-3 border-b border-gray-100">
              <p className="font-bold text-lg text-gray-800">{selectedPayslip.employee?.full_name}</p>
              <p className="text-sm text-gray-500">Tháng {selectedPayslip.month}/{selectedPayslip.year}</p>
              <Badge variant={statusMap[selectedPayslip.status]?.variant} className="mt-1">
                {statusMap[selectedPayslip.status]?.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <Row label="Lương cơ bản" value={formatCurrency(selectedPayslip.base_salary)} />
              <Row label={`Ngày công (${selectedPayslip.actual_work_days}/${selectedPayslip.work_days})`}
                value={formatCurrency((selectedPayslip.base_salary / selectedPayslip.work_days) * selectedPayslip.actual_work_days)} />
              {selectedPayslip.overtime_hours > 0 && (
                <Row label={`Tăng ca (${selectedPayslip.overtime_hours}h)`} value={formatCurrency(selectedPayslip.overtime_pay)} />
              )}
              <Row label="Phụ cấp" value={formatCurrency(selectedPayslip.total_allowances)} />
              <Row label="Gross" value={formatCurrency(selectedPayslip.gross_salary)} className="font-semibold border-t border-gray-100 pt-2" />
              <Row label="Bảo hiểm" value={`-${formatCurrency(selectedPayslip.insurance_amount)}`} className="text-red-600" />
              <Row label="Thuế TNCN" value={`-${formatCurrency(selectedPayslip.tax_amount)}`} className="text-red-600" />
              {selectedPayslip.total_deductions > 0 && (
                <Row label="Khấu trừ khác" value={`-${formatCurrency(selectedPayslip.total_deductions)}`} className="text-red-600" />
              )}
              <Row label="THỰC NHẬN" value={formatCurrency(selectedPayslip.net_salary)}
                className="font-bold text-blue-700 text-base border-t border-gray-200 pt-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" leftIcon={<Download size={14} />} onClick={() => exportPDF(selectedPayslip)} size="sm">
                Xuất file
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
