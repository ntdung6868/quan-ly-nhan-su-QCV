import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Tên phòng ban là bắt buộc"),
  code: z.string().min(1, "Mã phòng ban là bắt buộc"),
  description: z.string().optional(),
  manager_id: z.string().nullable(),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
