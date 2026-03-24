import { z } from "zod";

export const holidaySchema = z.object({
  name: z.string().min(1, "Tên ngày lễ là bắt buộc"),
  date: z.string().min(1, "Ngày là bắt buộc"),
  is_recurring: z.boolean({
    error: "Giá trị lặp lại hàng năm không hợp lệ",
  }),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;
