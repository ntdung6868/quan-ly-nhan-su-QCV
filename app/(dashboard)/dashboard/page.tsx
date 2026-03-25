"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";
import { CheckInModal } from "@/components/attendance/check-in-modal";
import {
  Users, Clock, CalendarOff,
  CheckSquare, TrendingUp, ClockIcon,
  Bell, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Attendance } from "@/types/database";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { employee, profile, isAdmin, isManager } = useAuth();
  const { data, isLoading } = useDashboard(employee?.id, isAdmin, isManager);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [localAttendance, setLocalAttendance] = useState<Attendance | null>(null);

  const todayAttendance = localAttendance ?? data?.todayAttendance ?? null;
  const recentLeaves = data?.recentLeaves ?? [];
  const tasks = data?.tasks ?? [];
  const announcements = data?.announcements ?? [];
  const stats = data?.stats ?? {
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    tasksInProgress: 0,
    attendanceRate: 0,
  };
  const weeklyData = data?.weeklyData ?? [];

  function getAttendanceStatus() {
    if (!todayAttendance) return null;
    if (todayAttendance.check_in && !todayAttendance.check_out) return "checked_in";
    if (todayAttendance.check_in && todayAttendance.check_out) return "checked_out";
    return null;
  }

  const attStatus = getAttendanceStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Welcome skeleton */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-white/20 animate-pulse" />
              <div className="h-6 w-48 rounded bg-white/20 animate-pulse" />
              <div className="h-4 w-32 rounded bg-white/20 animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-lg bg-white/20 animate-pulse" />
          </div>
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl ring-1 ring-border p-5">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl ring-1 ring-border p-5">
            <div className="h-5 w-40 rounded bg-muted animate-pulse mb-4" />
            <div className="h-50 rounded bg-muted animate-pulse" />
          </div>
          <div className="bg-card rounded-xl ring-1 ring-border p-5">
            <div className="h-5 w-32 rounded bg-muted animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome + Check-in */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-100 text-sm">Xin chào,</p>
            <h2 className="text-xl font-bold mt-0.5">
              {employee?.full_name || profile?.full_name || "Người dùng"}
            </h2>
            <ClientDate />
          </div>
          {!isAdmin && (
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
                  <div className="text-blue-200 text-sm">Đã hoàn thành hôm nay</div>
                </div>
              )}
              <button
                onClick={() => setCheckInOpen(true)}
                disabled={attStatus === "checked_out"}
                className="px-4 py-2 bg-white/90 text-blue-700 font-medium rounded-lg text-sm hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {attStatus === "checked_in"
                  ? "Check-out"
                  : attStatus === "checked_out"
                    ? "Đã chấm công"
                    : "Check-in"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Nhân viên"
            value={stats.totalEmployees}
            subtitle="Đang hoạt động"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Có mặt hôm nay"
            value={`${stats.presentToday}/${stats.totalEmployees}`}
            subtitle={`${stats.attendanceRate}% tỷ lệ`}
            icon={Clock}
            color="green"
          />
          <StatCard
            title="Chờ duyệt nghỉ"
            value={stats.pendingLeaves}
            subtitle="Đơn nghỉ phép"
            icon={CalendarOff}
            color="yellow"
          />
          <StatCard
            title="Công việc đang làm"
            value={stats.tasksInProgress}
            subtitle="Đang xử lý"
            icon={CheckSquare}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly chart (admin/manager) */}
        {(isAdmin || isManager) && weeklyData.length > 0 && (
          <div className="lg:col-span-2 bg-card rounded-xl ring-1 ring-border p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Chấm công 7 ngày qua</h3>
              <TrendingUp size={16} className="text-muted-foreground/70" />
            </div>
            <div className="flex-1 flex items-center">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="present" fill="#22c55e" name="Đúng giờ" radius={[3, 3, 0, 0]} />
                <Bar dataKey="late" fill="#f59e0b" name="Đi trễ" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" name="Vắng" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Announcements */}
        <div className="bg-card rounded-xl ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Thông báo</h3>
            <Link
              href="/notifications"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm text-center py-6">
              Chưa có thông báo
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Link key={a.id} href="/notifications" className="block border-l-2 border-blue-500 pl-3 hover:bg-accent/50 rounded-r-lg -ml-0.5 transition">
                  {a.is_pinned && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Ghim
                    </span>
                  )}
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {a.content}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDate(a.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My tasks */}
        <div className="bg-card rounded-xl ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Công việc của tôi</h3>
            <Link
              href="/tasks"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm text-center py-6">
              Không có công việc nào
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      t.priority === "urgent"
                        ? "bg-red-500"
                        : t.priority === "high"
                          ? "bg-orange-500"
                          : t.priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{t.title}</p>
                    {t.due_date && (
                      <p className="text-xs text-muted-foreground/70">
                        {formatDate(t.due_date)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={t.status === "in_progress" ? "info" : "default"}
                    className="shrink-0"
                  >
                    {t.status === "todo" ? "Chờ" : "Đang làm"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent leaves */}
        <div className="bg-card rounded-xl ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Nghỉ phép gần đây</h3>
            <Link
              href="/leaves"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm text-center py-6">
              Chưa có đơn nghỉ phép
            </p>
          ) : (
            <div className="space-y-2">
              {recentLeaves.map((leave) => (
                <Link
                  key={leave.id}
                  href="/leaves"
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm text-foreground">
                      {formatDate(leave.start_date)} &ndash; {formatDate(leave.end_date)}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{leave.days} ngày</p>
                  </div>
                  <Badge
                    variant={
                      leave.status === "approved"
                        ? "success"
                        : leave.status === "rejected"
                          ? "error"
                          : leave.status === "cancelled"
                            ? "secondary"
                            : "warning"
                    }
                  >
                    {leave.status === "approved"
                      ? "Duyệt"
                      : leave.status === "rejected"
                        ? "Từ chối"
                        : leave.status === "cancelled"
                          ? "Huỷ"
                          : "Chờ duyệt"}
                  </Badge>
                </Link>
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
            setLocalAttendance(att);
            setCheckInOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ClientDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(formatDate(new Date()));
  }, []);
  return <p className="text-blue-100 text-sm mt-1">{date}</p>;
}
