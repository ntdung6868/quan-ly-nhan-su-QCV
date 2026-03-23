"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckInModal } from "@/components/attendance/check-in-modal";
import { formatDate, formatTime, formatDateTime } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, AlertTriangle, Plus, Calendar, Search } from "lucide-react";
import type { Attendance } from "@/types/database";
import dayjs from "dayjs";

const statusMap = {
  present: { label: "Có mặt", variant: "success" as const },
  late: { label: "Đi trễ", variant: "warning" as const },
  absent: { label: "Vắng", variant: "error" as const },
  half_day: { label: "Nửa ngày", variant: "info" as const },
};

export default function AttendancePage() {
  const { employee, isAdmin, isManager } = useAuth();
  const supabase = createClient();
  const [attendances, setAttendances] = useState<(Attendance & { employee?: { full_name: string } })[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [search, setSearch] = useState("");

  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    loadAttendance();
  }, [employee?.id, month, isAdmin, isManager]);

  async function loadAttendance() {
    if (!employee?.id) return;
    setIsLoading(true);
    try {
      const startDate = dayjs(month + "-01").startOf("month").format("YYYY-MM-DD");
      const endDate = dayjs(month + "-01").endOf("month").format("YYYY-MM-DD");

      let query = supabase
        .from("attendance")
        .select(`*, employee:employees(full_name)`)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (!isAdmin && !isManager) {
        query = query.eq("employee_id", employee.id);
      }

      const { data } = await query;
      const attData = (data || []) as (Attendance & { employee?: { full_name: string } })[];
      setAttendances(attData);

      const todayRec = attData.find(
        (a) => a.date === today && a.employee_id === employee.id
      );
      setTodayAttendance(todayRec || null);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = attendances.filter((a) =>
    !search || (a.employee?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    present: attendances.filter((a) => a.employee_id === employee?.id && a.status === "present").length,
    late: attendances.filter((a) => a.employee_id === employee?.id && a.status === "late").length,
    absent: attendances.filter((a) => a.employee_id === employee?.id && a.status === "absent").length,
  };

  const isCheckOut = !!(todayAttendance?.check_in && !todayAttendance?.check_out);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Có mặt" value={stats.present} subtitle="trong tháng" icon={CheckCircle} color="green" />
        <StatCard title="Đi trễ" value={stats.late} subtitle="trong tháng" icon={AlertTriangle} color="yellow" />
        <StatCard title="Vắng" value={stats.absent} subtitle="trong tháng" icon={XCircle} color="red" />
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(isAdmin || isManager) && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhân viên..."
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <Button
          onClick={() => setCheckInOpen(true)}
          disabled={todayAttendance?.check_out !== null && todayAttendance?.check_out !== undefined}
          leftIcon={<Plus size={14} />}
          size="sm"
        >
          {isCheckOut ? "Check-out" : "Check-in"}
        </Button>
      </div>

      {/* Today status */}
      {todayAttendance && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">Hôm nay - {formatDate(today)}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-blue-700">
              {todayAttendance.check_in && (
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Vào: {formatTime(todayAttendance.check_in)}
                </span>
              )}
              {todayAttendance.check_out && (
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Ra: {formatTime(todayAttendance.check_out)}
                </span>
              )}
              {todayAttendance.work_hours && (
                <span>{todayAttendance.work_hours}h làm việc</span>
              )}
            </div>
          </div>
          <Badge variant={statusMap[todayAttendance.status]?.variant || "default"}>
            {statusMap[todayAttendance.status]?.label || todayAttendance.status}
          </Badge>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Lịch sử chấm công</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock} title="Chưa có dữ liệu chấm công" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {(isAdmin || isManager) && <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Vào ca</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ra ca</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Giờ làm</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">OT</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    {(isAdmin || isManager) && (
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {a.employee?.full_name || "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700">{formatDate(a.date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.check_in ? formatTime(a.check_in) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.check_out ? formatTime(a.check_out) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.work_hours ? `${a.work_hours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.overtime_hours && a.overtime_hours > 0 ? (
                        <span className="text-orange-600">{a.overtime_hours}h</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[a.status]?.variant || "default"}>
                        {statusMap[a.status]?.label || a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {checkInOpen && (
        <CheckInModal
          open={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          currentAttendance={todayAttendance}
          onSuccess={(att) => {
            setTodayAttendance(att);
            setCheckInOpen(false);
            loadAttendance();
          }}
        />
      )}
    </div>
  );
}
