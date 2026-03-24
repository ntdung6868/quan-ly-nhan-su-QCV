import { z } from "zod";

export const leaveSchema = z.object({
  leave_type_id: z.string().min(1, "Loại nghỉ phép là bắt buộc"),
  start_date: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  end_date: z.string().min(1, "Ngày kết thúc là bắt buộc"),
  reason: z.string().min(1, "Lý do nghỉ phép là bắt buộc"),
}).refine((data) => data.end_date >= data.start_date, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["end_date"],
});

export type LeaveFormValues = z.infer<typeof leaveSchema>;
