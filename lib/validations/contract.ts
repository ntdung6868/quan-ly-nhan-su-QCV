import { z } from "zod";

export const contractSchema = z.object({
  employee_id: z.string().min(1, "Nhân viên là bắt buộc"),
  type: z.enum(["full_time", "part_time", "probation", "intern"], {
    error: "Loại hợp đồng không hợp lệ",
  }),
  start_date: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  end_date: z.string().optional(),
  base_salary: z.number().min(0, "Lương cơ bản không được âm"),
  allowance: z.number().min(0, "Phụ cấp không được âm"),
  attendance_bonus: z.number().min(0, "Chuyên cần không được âm"),
  dependents: z.number().int().min(0, "Số người phụ thuộc không được âm"),
  status: z.enum(["active", "expired", "terminated"], {
    error: "Trạng thái hợp đồng không hợp lệ",
  }),
  notes: z.string().optional(),
});

export type ContractFormValues = z.infer<typeof contractSchema>;
