import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().min(1, "Tiêu đề thông báo là bắt buộc"),
  content: z.string().min(1, "Nội dung thông báo là bắt buộc"),
  is_pinned: z.boolean({
    error: "Giá trị ghim không hợp lệ",
  }),
  expires_at: z.string().optional(),
});

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
