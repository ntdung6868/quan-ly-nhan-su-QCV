import { z } from "zod";

export const companyConfigSchema = z.object({
  company_name: z.string().min(1, "Tên công ty là bắt buộc"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.email("Email không hợp lệ").optional(),
  logo_url: z.string().optional(),
  gps_enabled: z.boolean({ error: "Giá trị GPS không hợp lệ" }),
  gps_lat: z.number().nullable(),
  gps_lng: z.number().nullable(),
  gps_radius: z.number().min(0, "Bán kính GPS không được âm"),
  photo_required: z.boolean({ error: "Giá trị yêu cầu ảnh không hợp lệ" }),
  work_start_time: z.string().min(1, "Giờ bắt đầu là bắt buộc"),
  work_end_time: z.string().min(1, "Giờ kết thúc là bắt buộc"),
  late_after_time: z.string().min(1, "Giờ tính trễ là bắt buộc"),
});

export type CompanyConfigFormValues = z.infer<typeof companyConfigSchema>;

export const salaryConfigSchema = z.object({
  personal_income_tax_rate: z
    .number()
    .min(0, "Thuế thu nhập cá nhân không được âm"),
  social_insurance_rate: z
    .number()
    .min(0, "Tỷ lệ bảo hiểm xã hội không được âm"),
  health_insurance_rate: z
    .number()
    .min(0, "Tỷ lệ bảo hiểm y tế không được âm"),
  unemployment_insurance_rate: z
    .number()
    .min(0, "Tỷ lệ bảo hiểm thất nghiệp không được âm"),
  tax_threshold: z.number().min(0, "Mức giảm trừ thuế không được âm"),
  standard_work_days: z.number().min(0, "Số ngày công chuẩn không được âm"),
  overtime_multiplier: z.number().min(0, "Hệ số tăng ca không được âm"),
});

export type SalaryConfigFormValues = z.infer<typeof salaryConfigSchema>;
