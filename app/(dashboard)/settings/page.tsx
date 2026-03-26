"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  companyConfigSchema,
  salaryConfigSchema,
  type CompanyConfigFormValues,
  type SalaryConfigFormValues,
} from "@/lib/validations";
import {
  useCompanyConfig,
  useSalaryConfigSettings,
  useSaveCompanyConfig,
  useSaveSalaryConfig,
} from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormField } from "@/components/ui/form-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Building2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: companyData, isLoading: companyLoading } = useCompanyConfig();
  const { data: salaryData, isLoading: salaryLoading } = useSalaryConfigSettings();
  const saveCompanyMutation = useSaveCompanyConfig();
  const saveSalaryMutation = useSaveSalaryConfig();

  const companyForm = useForm<CompanyConfigFormValues>({
    resolver: zodResolver(companyConfigSchema),
    mode: "onChange",
    defaultValues: {
      company_name: "",
      address: "",
      phone: "",
      email: "",
      logo_url: "",
      gps_enabled: false,
      gps_lat: null,
      gps_lng: null,
      gps_radius: 100,
      work_start_time: "08:00",
      work_end_time: "17:00",
      late_after_time: "08:15",
    },
  });

  const salaryForm = useForm<SalaryConfigFormValues>({
    resolver: zodResolver(salaryConfigSchema),
    mode: "onChange",
    defaultValues: {
      personal_income_tax_rate: 10,
      social_insurance_rate: 8,
      health_insurance_rate: 1.5,
      unemployment_insurance_rate: 1,
      tax_threshold: 11000000,
      standard_work_days: 26,
      overtime_multiplier: 1.5,
    },
  });

  // Populate company form when data loads
  useEffect(() => {
    if (companyData) {
      companyForm.reset({
        company_name: companyData.company_name ?? "",
        address: companyData.address ?? "",
        phone: companyData.phone ?? "",
        email: companyData.email ?? "",
        logo_url: companyData.logo_url ?? "",
        gps_enabled: companyData.gps_enabled ?? false,
        gps_lat: companyData.gps_lat ?? null,
        gps_lng: companyData.gps_lng ?? null,
        gps_radius: companyData.gps_radius ?? 100,
        work_start_time: companyData.work_start_time ?? "08:00",
        work_end_time: companyData.work_end_time ?? "17:00",
        late_after_time: companyData.late_after_time ?? "08:15",
      });
    }
  }, [companyData, companyForm]);

  // Populate salary form when data loads
  useEffect(() => {
    if (salaryData) {
      salaryForm.reset({
        personal_income_tax_rate: salaryData.personal_income_tax_rate ?? 10,
        social_insurance_rate: salaryData.social_insurance_rate ?? 8,
        health_insurance_rate: salaryData.health_insurance_rate ?? 1.5,
        unemployment_insurance_rate: salaryData.unemployment_insurance_rate ?? 1,
        tax_threshold: salaryData.tax_threshold ?? 11000000,
        standard_work_days: salaryData.standard_work_days ?? 26,
        overtime_multiplier: companyData?.overtime_multiplier ?? 1.5,
      });
    }
  }, [salaryData, salaryForm]);

  function onSaveCompany(values: CompanyConfigFormValues) {
    saveCompanyMutation.mutate(
      { id: companyData?.id, ...values },
      {
        onSuccess: () => toast.success("Đã lưu cấu hình công ty"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function onSaveSalary(values: SalaryConfigFormValues) {
    const { overtime_multiplier, ...salaryValues } = values;

    // overtime_multiplier thuộc company_config
    if (companyData?.id) {
      saveCompanyMutation.mutate({ id: companyData.id, overtime_multiplier });
    }

    saveSalaryMutation.mutate(
      { id: salaryData?.id, ...salaryValues },
      {
        onSuccess: () => toast.success("Đã lưu cấu hình lương"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  const isLoading = companyLoading || salaryLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="bg-card rounded-xl ring-1 ring-border p-1 flex gap-1 animate-pulse">
          <div className="flex-1 h-10 rounded-lg bg-muted" />
          <div className="flex-1 h-10 rounded-lg bg-muted" />
        </div>
        <div className="bg-card rounded-xl ring-1 ring-border p-6 animate-pulse">
          <div className="h-5 w-40 rounded bg-muted mb-5" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-9 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const gpsEnabled = companyForm.watch("gps_enabled");

  return (
    <div className="space-y-5">
      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">
            <span className="flex items-center gap-2">
              <Building2 size={15} /> Cấu hình công ty
            </span>
          </TabsTrigger>
          <TabsTrigger value="salary">
            <span className="flex items-center gap-2">
              <DollarSign size={15} /> Cấu hình lương
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Company Config Tab */}
        <TabsContent value="company">
          <form onSubmit={companyForm.handleSubmit(onSaveCompany)}>
            <div className="bg-card rounded-xl ring-1 ring-border p-6">
              <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                <Building2 size={18} className="text-primary" /> Thông tin công ty
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tên công ty" required error={companyForm.formState.errors.company_name?.message}>
                  <input {...companyForm.register("company_name")} className="input" />
                </FormField>
                <FormField label="Email" error={companyForm.formState.errors.email?.message}>
                  <input type="email" {...companyForm.register("email")} className="input" />
                </FormField>
                <FormField label="Số điện thoại" error={companyForm.formState.errors.phone?.message}>
                  <input {...companyForm.register("phone")} className="input" />
                </FormField>
                <FormField label="Địa chỉ" error={companyForm.formState.errors.address?.message}>
                  <input {...companyForm.register("address")} className="input" />
                </FormField>
              </div>

              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="font-semibold text-foreground mb-4">Cấu hình chấm công</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <FormField label="Giờ bắt đầu làm" required error={companyForm.formState.errors.work_start_time?.message}>
                    <input type="time" step="60" {...companyForm.register("work_start_time")} className="input" />
                  </FormField>
                  <FormField label="Giờ kết thúc làm" required error={companyForm.formState.errors.work_end_time?.message}>
                    <input type="time" step="60" {...companyForm.register("work_end_time")} className="input" />
                  </FormField>
                  <FormField label="Trễ sau giờ" required hint="Check-in sau giờ này tính đi trễ" error={companyForm.formState.errors.late_after_time?.message}>
                    <input type="time" step="60" {...companyForm.register("late_after_time")} className="input" />
                  </FormField>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...companyForm.register("gps_enabled")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-foreground">Bắt buộc kiểm tra vị trí GPS khi chấm công</span>
                  </label>
                  {gpsEnabled && (
                    <div className="grid grid-cols-3 gap-3 ml-7">
                      <FormField label="Vĩ độ (Lat)" error={companyForm.formState.errors.gps_lat?.message}>
                        <input
                          type="number"
                          step="any"
                          placeholder="10.7769"
                          {...companyForm.register("gps_lat", { valueAsNumber: true })}
                          className="input"
                        />
                      </FormField>
                      <FormField label="Kinh độ (Lng)" error={companyForm.formState.errors.gps_lng?.message}>
                        <input
                          type="number"
                          step="any"
                          placeholder="106.7009"
                          {...companyForm.register("gps_lng", { valueAsNumber: true })}
                          className="input"
                        />
                      </FormField>
                      <FormField label="Bán kính (mét)" error={companyForm.formState.errors.gps_radius?.message}>
                        <input
                          type="number"
                          {...companyForm.register("gps_radius", { valueAsNumber: true })}
                          className="input"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-5">
                <Button loading={saveCompanyMutation.isPending} type="submit" leftIcon={<Settings size={14} />}>
                  Lưu cấu hình công ty
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* Salary Config Tab */}
        <TabsContent value="salary">
          <form onSubmit={salaryForm.handleSubmit(onSaveSalary)}>
            <div className="bg-card rounded-xl ring-1 ring-border p-6">
              <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                <DollarSign size={18} className="text-green-500" /> Cấu hình tính lương
              </h3>
              {/* Bảo hiểm */}
              <h4 className="text-sm font-semibold text-foreground mb-3">Tỷ lệ bảo hiểm bắt buộc (NV đóng)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="BHXH (%)" error={salaryForm.formState.errors.social_insurance_rate?.message}>
                  <input
                    type="number"
                    step="0.1"
                    {...salaryForm.register("social_insurance_rate", { valueAsNumber: true })}
                    className="input"
                  />
                </FormField>
                <FormField label="BHYT (%)" error={salaryForm.formState.errors.health_insurance_rate?.message}>
                  <input
                    type="number"
                    step="0.1"
                    {...salaryForm.register("health_insurance_rate", { valueAsNumber: true })}
                    className="input"
                  />
                </FormField>
                <FormField label="BHTN (%)" error={salaryForm.formState.errors.unemployment_insurance_rate?.message}>
                  <input
                    type="number"
                    step="0.1"
                    {...salaryForm.register("unemployment_insurance_rate", { valueAsNumber: true })}
                    className="input"
                  />
                </FormField>
              </div>

              {/* Ngày công & tăng ca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField label="Ngày công chuẩn/tháng" error={salaryForm.formState.errors.standard_work_days?.message}>
                  <input
                    type="number"
                    {...salaryForm.register("standard_work_days", { valueAsNumber: true })}
                    className="input"
                  />
                </FormField>
                <FormField label="Hệ số tăng ca" error={salaryForm.formState.errors.overtime_multiplier?.message}>
                  <input
                    type="number"
                    step="0.1"
                    {...salaryForm.register("overtime_multiplier", { valueAsNumber: true })}
                    className="input"
                  />
                </FormField>
              </div>

              {/* Công thức */}
              <div className="bg-primary/5 rounded-lg p-4 mt-5 ring-1 ring-primary/10">
                <p className="text-sm font-semibold text-foreground mb-2">Công thức tính lương (Luật Thuế TNCN 2026)</p>
                <div className="text-xs text-muted-foreground font-mono leading-relaxed space-y-1">
                  <p>Gross = ((Lương CB + Phụ cấp) / Ngày chuẩn &times; Ngày thực) + Chuyên cần + Tăng ca</p>
                  <p>Bảo hiểm = Lương CB &times; (BHXH + BHYT + BHTN)%</p>
                  <p>Thu nhập tính thuế = Gross - Bảo hiểm - 15.500.000 - (6.200.000 &times; số người PT)</p>
                  <p>Thuế TNCN = Lũy tiến từng phần (nếu &gt; 0)</p>
                  <p className="font-semibold text-foreground">Thực nhận = Gross - Bảo hiểm - Thuế TNCN</p>
                </div>
              </div>

              {/* Biểu thuế lũy tiến */}
              <div className="bg-muted/50 rounded-lg p-4 mt-3 ring-1 ring-border">
                <p className="text-sm font-semibold text-foreground mb-2">Biểu thuế lũy tiến từng phần (NQ 110/2025)</p>
                <p className="text-xs text-muted-foreground mb-2">Giảm trừ: bản thân 15,5 triệu/tháng — người phụ thuộc 6,2 triệu/tháng/người</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-1.5 font-medium">Bậc</th>
                      <th className="text-left py-1.5 font-medium">Thu nhập tính thuế/tháng</th>
                      <th className="text-right py-1.5 font-medium">Thuế suất</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    <tr className="border-b border-border/50"><td className="py-1.5">1</td><td>Đến 10 triệu</td><td className="text-right">5%</td></tr>
                    <tr className="border-b border-border/50"><td className="py-1.5">2</td><td>Trên 10 — 30 triệu</td><td className="text-right">10%</td></tr>
                    <tr className="border-b border-border/50"><td className="py-1.5">3</td><td>Trên 30 — 60 triệu</td><td className="text-right">20%</td></tr>
                    <tr className="border-b border-border/50"><td className="py-1.5">4</td><td>Trên 60 — 100 triệu</td><td className="text-right">30%</td></tr>
                    <tr><td className="py-1.5">5</td><td>Trên 100 triệu</td><td className="text-right">35%</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-5">
                <Button loading={saveSalaryMutation.isPending} type="submit" leftIcon={<DollarSign size={14} />}>
                  Lưu cấu hình lương
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
