"use client";

import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAttendance, type AttendanceWithEmployee } from "@/hooks/use-attendance";
import { useTodayAttendance } from "@/hooks/use-attendance";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "@/components/attendance/check-in-modal";
import { formatDate, formatTime } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, AlertTriangle, Plus, Calendar, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

const statusMap = {
  present: { label: "Đúng giờ", variant: "success" as const },
  late: { label: "Đi trễ", variant: "warning" as const },
  absent: { label: "Vắng", variant: "error" as const },
};

export default function AttendancePage() {
  const { employee, isAdmin, isManager } = useAuth();
  const queryClient = useQueryClient();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const today = dayjs().format("YYYY-MM-DD");

  const { data: attendances = [], isLoading } = useAttendance({
    employeeId: employee?.id,
    month,
    isAdmin,
    isManager,
  });

  const { data: todayAttendance } = useTodayAttendance(employee?.id);

  const filtered = useMemo(
    () =>
      attendances.filter(
        (a) =>
          !search ||
          (a.employee?.full_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [attendances, search]
  );

  // Reset page khi filter thay đổi
  const filterKey = `${month}-${search}`;
  const prevFilterKey = useRef(filterKey);
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (page !== 1) setPage(1);
  }

  const paginatedData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const stats = useMemo(() => {
    const mine = attendances.filter((a) => a.employee_id === employee?.id);
    return {
      present: mine.filter((a) => a.status === "present" || a.status === "late").length,
      late: mine.filter((a) => a.status === "late").length,
      absent: mine.filter((a) => a.status === "absent").length,
    };
  }, [attendances, employee?.id]);

  const isCheckOut = !!(todayAttendance?.check_in && !todayAttendance?.check_out);

  const columns = useMemo(() => {
    const cols: Column<AttendanceWithEmployee>[] = [];

    if (isAdmin || isManager) {
      cols.push({
        header: "Nhân viên",
        cell: (row) => (
          <span className="font-medium text-foreground">
            {row.employee?.full_name || "\u2014"}
          </span>
        ),
      });
    }

    cols.push(
      {
        header: "Ngày",
        cell: (row) => <span className="text-foreground">{formatDate(row.date)}</span>,
      },
      {
        header: "Vào ca",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.check_in ? formatTime(row.check_in) : "\u2014"}
          </span>
        ),
      },
      {
        header: "Ra ca",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.check_out ? formatTime(row.check_out) : "\u2014"}
          </span>
        ),
      },
      {
        header: "Giờ làm",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.work_hours ? `${row.work_hours}h` : "\u2014"}
          </span>
        ),
      },
      {
        header: "OT",
        cell: (row) =>
          row.overtime_hours && row.overtime_hours > 0 ? (
            <span className="text-orange-600 dark:text-orange-400">
              {row.overtime_hours}h
            </span>
          ) : (
            <span className="text-muted-foreground">{"\u2014"}</span>
          ),
      },
      {
        header: "Trạng thái",
        cell: (row) => (
          <Badge variant={statusMap[row.status]?.variant || "default"}>
            {statusMap[row.status]?.label || row.status}
          </Badge>
        ),
      }
    );

    return cols;
  }, [isAdmin, isManager]);

  return (
    <div className="space-y-5">
      {/* Stats (không hiện cho admin) */}
      {!isAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="Đúng giờ"
            value={stats.present}
            subtitle="trong tháng"
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Đi trễ"
            value={stats.late}
            subtitle="trong tháng"
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="Vắng"
            value={stats.absent}
            subtitle="trong tháng"
            icon={XCircle}
            color="red"
          />
        </div>
      )}

      {/* Action bar */}
      <div className="bg-card rounded-xl ring-1 ring-border p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar size={16} className="text-muted-foreground shrink-0" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-border bg-card text-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {(isAdmin || isManager) && (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhân viên..."
              className="pl-8 pr-3 py-1.5 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        )}
        {!isAdmin && (
          <Button
            onClick={() => setCheckInOpen(true)}
            disabled={
              todayAttendance?.check_out !== null &&
              todayAttendance?.check_out !== undefined
            }
            leftIcon={<Plus size={14} />}
            size="sm"
          >
            {isCheckOut ? "Check-out" : "Check-in"}
          </Button>
        )}
      </div>

      {/* Today status (không hiện cho admin) */}
      {!isAdmin && todayAttendance && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Hôm nay - {formatDate(today)}
            </p>
            <div className="flex items-center gap-4 mt-1 text-sm text-blue-700 dark:text-blue-400">
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
      <div className="ring-1 ring-border rounded-xl overflow-hidden">
        <div className="bg-card px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Lịch sử chấm công</h3>
        </div>
        <DataTable
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          emptyState={{
            icon: Clock,
            title: "Chưa có dữ liệu chấm công",
          }}
          pagination={{
            page,
            pageSize,
            total: filtered.length,
            onPageChange: setPage,
          }}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          className="rounded-none ring-0"
        />
      </div>

      {checkInOpen && (
        <CheckInModal
          open={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          currentAttendance={todayAttendance ?? null}
          onSuccess={() => {
            setCheckInOpen(false);
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )}
    </div>
  );
}
