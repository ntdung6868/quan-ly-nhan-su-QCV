"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Attendance, Leave, Announcement, Task } from "@/types/database";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  tasksInProgress: number;
  attendanceRate: number;
}

interface WeeklyAttendanceEntry {
  day: string;
  present: number;
  late: number;
  absent: number;
}

interface DashboardData {
  todayAttendance: Attendance | null;
  recentLeaves: Leave[];
  announcements: Announcement[];
  tasks: Task[];
  stats: DashboardStats;
  weeklyData: WeeklyAttendanceEntry[];
}

export function useDashboard(
  employeeId?: string,
  isAdmin?: boolean,
  isManager?: boolean
) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dashboard", employeeId, isAdmin, isManager],
    queryFn: async (): Promise<DashboardData> => {
      // Base queries every user needs
      const [attRes, leaveRes, taskRes, announcRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeId!)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("leaves")
          .select("*, leave_type:leave_types(name)")
          .eq("employee_id", employeeId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("tasks")
          .select("*, assignee:employees!assigned_to(full_name)")
          .eq("assigned_to", employeeId!)
          .neq("status", "done")
          .neq("status", "cancelled")
          .limit(5),
        supabase
          .from("announcements")
          .select("*")
          .or(
            "expires_at.is.null,expires_at.gt." + new Date().toISOString()
          )
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const todayAttendance = (attRes.data as Attendance) || null;
      const recentLeaves = (leaveRes.data || []) as Leave[];
      const tasks = (taskRes.data || []) as Task[];
      const announcements = (announcRes.data || []) as Announcement[];

      let stats: DashboardStats = {
        totalEmployees: 0,
        presentToday: 0,
        pendingLeaves: 0,
        tasksInProgress: 0,
        attendanceRate: 0,
      };
      let weeklyData: WeeklyAttendanceEntry[] = [];

      if (isAdmin || isManager) {
        // Lấy danh sách NV thật (bỏ admin)
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin");
        const adminUserIds = (adminProfiles || []).map((p: { id: string }) => p.id);

        const query = supabase
          .from("employees")
          .select("id")
          .eq("status", "active");
        if (adminUserIds.length > 0) {
          query.not("user_id", "in", `(${adminUserIds.join(",")})`);
        }
        const { data: realEmps } = await query;
        const realEmpIds = (realEmps || []).map((e: { id: string }) => e.id);

        const [presentRes, pendingLeaveRes, taskStatsRes] =
          await Promise.all([
            realEmpIds.length
              ? supabase
                  .from("attendance")
                  .select("id", { count: "exact" })
                  .eq("date", today)
                  .in("status", ["present", "late"])
                  .in("employee_id", realEmpIds)
              : { count: 0 },
            supabase
              .from("leaves")
              .select("id", { count: "exact" })
              .eq("status", "pending"),
            supabase
              .from("tasks")
              .select("id", { count: "exact" })
              .eq("status", "in_progress"),
          ]);

        const totalEmp = realEmpIds.length;
        const present = presentRes.count || 0;
        stats = {
          totalEmployees: totalEmp,
          presentToday: present,
          pendingLeaves: pendingLeaveRes.count || 0,
          tasksInProgress: taskStatsRes.count || 0,
          attendanceRate:
            totalEmp > 0 ? Math.round((present / totalEmp) * 100) : 0,
        };

        // Weekly attendance chart
        const days: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split("T")[0]);
        }

        let weekQuery = supabase
          .from("attendance")
          .select("date, status")
          .in("date", days);
        if (realEmpIds.length) weekQuery = weekQuery.in("employee_id", realEmpIds);
        const weekRes = await weekQuery;

        weeklyData = days.map((date) => {
          const dayAttendances = (weekRes.data || []).filter(
            (a: { date: string; status: string }) => a.date === date
          );
          return {
            day: new Date(date).toLocaleDateString("vi-VN", {
              weekday: "short",
            }),
            present: dayAttendances.filter((a: { status: string }) => a.status === "present").length,
            late: dayAttendances.filter((a: { status: string }) => a.status === "late").length,
            absent: dayAttendances.filter((a: { status: string }) => a.status === "absent").length,
          };
        });
      }

      return {
        todayAttendance,
        recentLeaves,
        announcements,
        tasks,
        stats,
        weeklyData,
      };
    },
    enabled: !!employeeId,
  });
}
