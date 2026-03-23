"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Settings, Building2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CompanyConfig, SalaryConfig } from "@/types/database";

export default function SettingsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"company" | "salary">("company");
  const [companyConfig, setCompanyConfig] = useState<Partial<CompanyConfig>>({});
  const [salaryConfig, setSalaryConfig] = useState<Partial<SalaryConfig>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [salaryId, setSalaryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [compRes, salRes] = await Promise.all([
      supabase.from("company_config").select("*").single(),
      supabase.from("salary_config").select("*").single(),
    ]);
    if (compRes.data) { setCompanyConfig(compRes.data); setCompanyId(compRes.data.id); }
    if (salRes.data) { setSalaryConfig(salRes.data); setSalaryId(salRes.data.id); }
    setIsLoading(false);
  }

  async function saveCompanyConfig() {
    setIsSaving(true);
    try {
      if (companyId) {
        const { error } = await supabase.from("company_config").update(companyConfig).eq("id", companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("company_config").insert(companyConfig as CompanyConfig).select().single();
        if (error) throw error;
        setCompanyId(data.id);
      }
      toast.success("Đã lưu cấu hình công ty");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSalaryConfig() {
    setIsSaving(true);
    try {
      if (salaryId) {
        const { error } = await supabase.from("salary_config").update(salaryConfig).eq("id", salaryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("salary_config").insert(salaryConfig as SalaryConfig).select().single();
        if (error) throw error;
        setSalaryId(data.id);
      }
      toast.success("Đã lưu cấu hình lương");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="text-center text-gray-400 py-8">Đang tải...</div>;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
        <button onClick={() => setActiveTab("company")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "company" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
          <Building2 size={15} /> Cấu hình công ty
        </button>
        <button onClick={() => setActiveTab("salary")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "salary" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
          <DollarSign size={15} /> Cấu hình lương
        </button>
      </div>

      {activeTab === "company" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-blue-500" /> Thông tin công ty
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tên công ty" required>
              <input value={companyConfig.company_name || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, company_name: e.target.value })}
                className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={companyConfig.email || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, email: e.target.value })}
                className="input" />
            </Field>
            <Field label="Số điện thoại">
              <input value={companyConfig.phone || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, phone: e.target.value })}
                className="input" />
            </Field>
            <Field label="Địa chỉ">
              <input value={companyConfig.address || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, address: e.target.value })}
                className="input" />
            </Field>
            <Field label="Giờ bắt đầu làm">
              <input type="time" value={companyConfig.work_start_time || "08:00"} onChange={(e) => setCompanyConfig({ ...companyConfig, work_start_time: e.target.value })}
                className="input" />
            </Field>
            <Field label="Giờ kết thúc làm">
              <input type="time" value={companyConfig.work_end_time || "17:00"} onChange={(e) => setCompanyConfig({ ...companyConfig, work_end_time: e.target.value })}
                className="input" />
            </Field>
            <Field label="Số ngày công chuẩn/tháng">
              <input type="number" value={companyConfig.standard_work_days || 26} onChange={(e) => setCompanyConfig({ ...companyConfig, standard_work_days: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Hệ số tăng ca">
              <input type="number" step="0.1" value={companyConfig.overtime_multiplier || 1.5} onChange={(e) => setCompanyConfig({ ...companyConfig, overtime_multiplier: Number(e.target.value) })}
                className="input" />
            </Field>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <h4 className="font-semibold text-gray-700 mb-4">Cấu hình GPS & Ảnh chấm công</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={companyConfig.gps_enabled || false}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, gps_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm text-gray-700">Bắt buộc kiểm tra vị trí GPS khi chấm công</span>
              </label>
              {companyConfig.gps_enabled && (
                <div className="grid grid-cols-3 gap-3 ml-7">
                  <Field label="Vĩ độ (Lat)">
                    <input type="number" step="0.0001" value={companyConfig.gps_lat || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, gps_lat: Number(e.target.value) })}
                      placeholder="10.7769" className="input" />
                  </Field>
                  <Field label="Kinh độ (Lng)">
                    <input type="number" step="0.0001" value={companyConfig.gps_lng || ""} onChange={(e) => setCompanyConfig({ ...companyConfig, gps_lng: Number(e.target.value) })}
                      placeholder="106.7009" className="input" />
                  </Field>
                  <Field label="Bán kính (mét)">
                    <input type="number" value={companyConfig.gps_radius || 100} onChange={(e) => setCompanyConfig({ ...companyConfig, gps_radius: Number(e.target.value) })}
                      className="input" />
                  </Field>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={companyConfig.photo_required || false}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, photo_required: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm text-gray-700">Bắt buộc chụp ảnh khi chấm công</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <Button loading={isSaving} onClick={saveCompanyConfig} leftIcon={<Settings size={14} />}>
              Lưu cấu hình công ty
            </Button>
          </div>
        </div>
      )}

      {activeTab === "salary" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign size={18} className="text-green-500" /> Cấu hình tính lương
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Thuế thu nhập cá nhân (%)" hint="Áp dụng khi thu nhập > ngưỡng miễn thuế">
              <input type="number" step="0.1" value={salaryConfig.personal_income_tax_rate || 10}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, personal_income_tax_rate: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Ngưỡng miễn thuế TNCN (VNĐ)">
              <input type="number" value={salaryConfig.tax_threshold || 11000000}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, tax_threshold: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Bảo hiểm xã hội (%)">
              <input type="number" step="0.1" value={salaryConfig.social_insurance_rate || 8}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, social_insurance_rate: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Bảo hiểm y tế (%)">
              <input type="number" step="0.1" value={salaryConfig.health_insurance_rate || 1.5}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, health_insurance_rate: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Bảo hiểm thất nghiệp (%)">
              <input type="number" step="0.1" value={salaryConfig.unemployment_insurance_rate || 1}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, unemployment_insurance_rate: Number(e.target.value) })}
                className="input" />
            </Field>
            <Field label="Ngày công chuẩn/tháng">
              <input type="number" value={salaryConfig.standard_work_days || 26}
                onChange={(e) => setSalaryConfig({ ...salaryConfig, standard_work_days: Number(e.target.value) })}
                className="input" />
            </Field>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm font-medium text-blue-800 mb-2">Công thức tính lương thực nhận:</p>
            <p className="text-xs text-blue-700 font-mono leading-relaxed">
              Gross = (Lương cơ bản / Ngày chuẩn × Ngày công thực tế) + Phụ cấp + Tăng ca<br />
              Bảo hiểm = Lương cơ bản × (BHXH + BHYT + BHTN)%<br />
              Thu nhập chịu thuế = Gross - Bảo hiểm - Ngưỡng miễn thuế<br />
              Thuế TNCN = Thu nhập chịu thuế × % thuế (nếu &gt; 0)<br />
              Thực nhận = Gross - Bảo hiểm - Thuế TNCN - Khấu trừ khác
            </p>
          </div>

          <div className="flex justify-end mt-5">
            <Button loading={isSaving} onClick={saveSalaryConfig} leftIcon={<DollarSign size={14} />}>
              Lưu cấu hình lương
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
