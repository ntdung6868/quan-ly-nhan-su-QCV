"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Attendance } from "@/types/database";
import dayjs from "dayjs";

export type AttendanceWithEmployee = Attendance & {
  employee?: { full_name: string };
};

interface UseAttendanceOptions {
  employeeId?: string;
  month?: string; // "YYYY-MM" format
  isAdmin?: boolean;
  isManager?: boolean;
}

export function useAttendance(options: UseAttendanceOptions = {}) {
  const supabase = createClient();
  const {
    employeeId,
    month = dayjs().format("YYYY-MM"),
    isAdmin,
    isManager,
  } = options;

  return useQuery({
    queryKey: ["attendance", { employeeId, month, isAdmin, isManager }],
    queryFn: async () => {
      const startDate = dayjs(month + "-01")
        .startOf("month")
        .format("YYYY-MM-DD");
      const endDate = dayjs(month + "-01")
        .endOf("month")
        .format("YYYY-MM-DD");

      let query = supabase
        .from("attendance")
        .select("*, employee:employees(full_name)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (!isAdmin && !isManager && employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AttendanceWithEmployee[];
    },
    enabled: isAdmin || isManager || !!employeeId,
  });
}

export function useTodayAttendance(employeeId?: string) {
  const supabase = createClient();
  const today = dayjs().format("YYYY-MM-DD");

  return useQuery({
    queryKey: ["attendance", "today", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId!)
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data as Attendance | null;
    },
    enabled: !!employeeId,
  });
}
