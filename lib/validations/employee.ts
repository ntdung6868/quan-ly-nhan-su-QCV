import { z } from "zod";

export const employeeSchema = z.object({
  full_name: z.string().min(1, "Họ tên là bắt buộc"),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  position: z.string().optional(),
  department_id: z.string().nullable(),
  hire_date: z.string().min(1, "Ngày vào làm là bắt buộc"),
  status: z.enum(["active", "inactive", "on_leave"], {
    error: "Trạng thái không hợp lệ",
  }),
  gender: z
    .enum(["male", "female", "other"], {
      error: "Giới tính không hợp lệ",
    })
    .optional(),
  address: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  tax_code: z.string().optional(),
  insurance_code: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
