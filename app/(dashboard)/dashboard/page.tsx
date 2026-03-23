"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import { CheckInModal } from "@/components/attendance/check-in-modal";
import {
  Users, Clock, CalendarOff, DollarSign,
  CheckSquare, TrendingUp, ClockIcon, MapPin,
  Bell, ChevronRight
} from "lucide-react";
import Link from "next/link";
import type { Attendance, Leave, Announcement, Task } from "@/types/database";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  tasksInProgress: number;
  attendanceRate: number;
}

export default function DashboardPage() {
  const { employee, profile, isAdmin, isManager } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0, presentToday: 0, pendingLeaves: 0,
    tasksInProgress: 0, attendanceRate: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<Leave[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{ day: string; present: number; absent: number }[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadDashboard();
  }, [employee?.id]);

  async function loadDashboard() {
    if (!employee?.id) return;

    const [attRes, leaveRes, taskRes, announcRes] = await Promise.all([
      supabase.from("attendance").select("*").eq("employee_id", employee.id).eq("date", today).single(),
      supabase.from("leaves").select("*, leave_type:leave_types(name)").eq("employee_id", employee.id)
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("tasks").select("*, assignee:employees!assigned_to(full_name)")
        .eq("assigned_to", employee.id).neq("status", "done").neq("status", "cancelled").limit(5),
      supabase.from("announcements").select("*").or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
    ]);

    setTodayAttendance(attRes.data || null);
    setRecentLeaves(leaveRes.data || []);
    setTasks(taskRes.data || []);
    setAnnouncements(announcRes.data || []);

    if (isAdmin || isManager) {
      const [empRes, presentRes, pendingLeaveRes, taskStatsRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("attendance").select("id", { count: "exact" }).eq("date", today).in("status", ["present", "late"]),
        supabase.from("leaves").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("tasks").select("id", { count: "exact" }).eq("status", "in_progress"),
      ]);

      const totalEmp = empRes.count || 0;
      const present = presentRes.count || 0;
      setStats({
        totalEmployees: totalEmp,
        presentToday: present,
        pendingLeaves: pendingLeaveRes.count || 0,
        tasksInProgress: taskStatsRes.count || 0,
        attendanceRate: totalEmp > 0 ? Math.round((present / totalEmp) * 100) : 0,
      });

      // Weekly attendance chart
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
      }
      const weekRes = await supabase.from("attendance").select("date, status").in("date", days);
      const grouped = days.map((date) => {
        const dayAttendances = (weekRes.data || []).filter((a) => a.date === date);
        return {
          day: new Date(date).toLocaleDateString("vi-VN", { weekday: "short" }),
          present: dayAttendances.filter((a) => ["present", "late"].includes(a.status)).length,
          absent: dayAttendances.filter((a) => a.status === "absent").length,
        };
      });
      setWeeklyData(grouped);
    }
  }

  function getAttendanceStatus() {
    if (!todayAttendance) return null;
    if (todayAttendance.check_in && !todayAttendance.check_out) return "checked_in";
    if (todayAttendance.check_in && todayAttendance.check_out) return "checked_out";
    return null;
  }

  const attStatus = getAttendanceStatus();

  return (
    <div className="space-y-6">
      {/* Welcome + Check-in */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-100 text-sm">Xin chào,</p>
            <h2 className="text-xl font-bold mt-0.5">
              {employee?.full_name || profile?.full_name || "Người dùng"} 👋
            </h2>
            <p className="text-blue-100 text-sm mt-1">{formatDate(new Date())}</p>
          </div>
          <div className="text-right">
            {attStatus === "checked_in" && todayAttendance?.check_in && (
              <div className="mb-2">
                <div className="flex items-center gap-1 text-green-300 text-sm">
                  <ClockIcon size={14} />
                  <span>Đã vào lúc {formatTime(todayAttendance.check_in)}</span>
                </div>
              </div>
            )}
            {attStatus === "checked_out" && (
              <div className="mb-2">
                <div className="text-blue-200 text-sm">Đã hoàn thành hôm nay ✓</div>
              </div>
            )}
            <button
              onClick={() => setCheckInOpen(true)}
              disabled={attStatus === "checked_out"}
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg text-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {attStatus === "checked_in" ? "Check-out" : attStatus === "checked_out" ? "Đã chấm công" : "Check-in"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Nhân viên" value={stats.totalEmployees} subtitle="Đang hoạt động" icon={Users} color="blue" />
          <StatCard title="Có mặt hôm nay" value={`${stats.presentToday}/${stats.totalEmployees}`} subtitle={`${stats.attendanceRate}% tỷ lệ`} icon={Clock} color="green" />
          <StatCard title="Chờ duyệt nghỉ" value={stats.pendingLeaves} subtitle="Đơn nghỉ phép" icon={CalendarOff} color="yellow" />
          <StatCard title="Công việc đang làm" value={stats.tasksInProgress} subtitle="Đang xử lý" icon={CheckSquare} color="purple" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly chart (admin/manager) */}
        {(isAdmin || isManager) && weeklyData.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Chấm công 7 ngày qua</h3>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="present" fill="#3b82f6" name="Có mặt" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" name="Vắng" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Announcements */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Thông báo nội bộ</h3>
            <Bell size={16} className="text-gray-400" />
          </div>
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Chưa có thông báo</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="border-l-2 border-blue-500 pl-3">
                  {a.is_pinned && <span className="text-xs text-blue-600 font-medium">📌 Ghim</span>}
                  <p className="text-sm font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Công việc của tôi</h3>
            <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Không có công việc nào</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    t.priority === "urgent" ? "bg-red-500" :
                    t.priority === "high" ? "bg-orange-500" :
                    t.priority === "medium" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{t.title}</p>
                    {t.due_date && (
                      <p className="text-xs text-gray-400">{formatDate(t.due_date)}</p>
                    )}
                  </div>
                  <Badge variant={t.status === "in_progress" ? "info" : "default"} className="flex-shrink-0">
                    {t.status === "todo" ? "Chờ" : "Đang làm"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent leaves */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Nghỉ phép gần đây</h3>
            <Link href="/leaves" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Chưa có đơn nghỉ phép</p>
          ) : (
            <div className="space-y-2">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-800">
                      {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                    </p>
                    <p className="text-xs text-gray-400">{leave.days} ngày</p>
                  </div>
                  <Badge variant={
                    leave.status === "approved" ? "success" :
                    leave.status === "rejected" ? "error" :
                    leave.status === "cancelled" ? "secondary" : "warning"
                  }>
                    {leave.status === "approved" ? "Duyệt" :
                     leave.status === "rejected" ? "Từ chối" :
                     leave.status === "cancelled" ? "Huỷ" : "Chờ duyệt"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Check-in modal */}
      {checkInOpen && (
        <CheckInModal
          open={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          currentAttendance={todayAttendance}
          onSuccess={(att) => {
            setTodayAttendance(att);
            setCheckInOpen(false);
          }}
        />
      )}
    </div>
  );
}
