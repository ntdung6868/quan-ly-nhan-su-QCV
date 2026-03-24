import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Tiêu đề công việc là bắt buộc"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"], {
    error: "Trạng thái công việc không hợp lệ",
  }),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    error: "Mức độ ưu tiên không hợp lệ",
  }),
  assigned_to: z.string().nullable(),
  department_id: z.string().nullable(),
  due_date: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
