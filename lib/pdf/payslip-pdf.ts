import jsPDF from "jspdf";
import { formatCurrency } from "@/lib/utils";

interface PayslipData {
  employee_name: string;
  employee_code: string;
  month: number;
  year: number;
  base_salary: number;
  work_days: number;
  actual_work_days: number;
  overtime_hours: number;
  overtime_pay: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  insurance_amount: number;
  tax_amount: number;
  net_salary: number;
  status: string;
}

export function generatePayslipPDF(payslip: PayslipData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.text("PHIEU LUONG", w / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(12);
  doc.text(`Thang ${payslip.month}/${payslip.year}`, w / 2, y, { align: "center" });
  y += 12;

  // Employee info
  doc.setFontSize(10);
  doc.text(`Nhan vien: ${payslip.employee_name}`, 20, y);
  doc.text(`Ma NV: ${payslip.employee_code}`, w - 20, y, { align: "right" });
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;

  // Earnings
  doc.setFontSize(11);
  doc.text("THU NHAP", 20, y);
  y += 7;
  doc.setFontSize(10);

  const earnings = [
    ["Luong co ban", formatCurrency(payslip.base_salary)],
    [`Ngay cong (${payslip.actual_work_days}/${payslip.work_days})`, formatCurrency((payslip.base_salary / payslip.work_days) * payslip.actual_work_days)],
    [`Tang ca (${payslip.overtime_hours}h)`, formatCurrency(payslip.overtime_pay)],
    ["Phu cap", formatCurrency(payslip.total_allowances)],
    ["Tong Gross", formatCurrency(payslip.gross_salary)],
  ];

  for (const [label, value] of earnings) {
    doc.text(label, 25, y);
    doc.text(value, w - 25, y, { align: "right" });
    y += 6;
  }

  y += 4;
  doc.line(20, y, w - 20, y);
  y += 8;

  // Deductions
  doc.setFontSize(11);
  doc.text("KHAU TRU", 20, y);
  y += 7;
  doc.setFontSize(10);

  const deductions = [
    ["Bao hiem", formatCurrency(payslip.insurance_amount)],
    ["Thue TNCN", formatCurrency(payslip.tax_amount)],
    ["Khau tru khac", formatCurrency(payslip.total_deductions)],
  ];

  for (const [label, value] of deductions) {
    doc.text(label, 25, y);
    doc.text(`-${value}`, w - 25, y, { align: "right" });
    y += 6;
  }

  y += 4;
  doc.line(20, y, w - 20, y);
  y += 10;

  // Net salary
  doc.setFontSize(14);
  doc.text("THUC NHAN:", 20, y);
  doc.text(formatCurrency(payslip.net_salary), w - 20, y, { align: "right" });

  // Save
  doc.save(`phieu-luong-${payslip.employee_code}-T${payslip.month}-${payslip.year}.pdf`);
}
