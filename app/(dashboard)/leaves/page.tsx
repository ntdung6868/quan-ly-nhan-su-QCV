"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useLeaves,
  useLeaveTypes,
  useLeaveAllocations,
  useCreateLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
  type LeaveWithRels,
} from "@/hooks/use-leaves";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { leaveSchema, type LeaveFormValues } from "@/lib/validations/leave";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOff, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { LeaveAllocation } from "@/types/database";

const statusMap = {
  pending: { label: "Chờ duyệt", variant: "warning" as const },
  approved: { label: "Đã duyệt", variant: "success" as const },
  rejected: { label: "Từ chối", variant: "error" as const },
  cancelled: { label: "Huỷ", variant: "secondary" as const },
};

export default function LeavesPage() {
  const { employee, isManager } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveWithRels | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<LeaveWithRels | null>(null);

  const statusFilter = filterStatus === "all" ? undefined : filterStatus;

  const { data: leaves = [], isLoading } = useLeaves({
    employeeId: employee?.id,
    isManager,
  });

  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: allocations = [] } = useLeaveAllocations(employee?.id);

  const createLeave = useCreateLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const cancelLeave = useCancelLeave();

  const filtered = useMemo(
    () => (statusFilter ? leaves.filter((l) => l.status === statusFilter) : leaves),
    [leaves, statusFilter]
  );

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    },
  });

  const watchStartDate = form.watch("start_date");
  const watchEndDate = form.watch("end_date");

  function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  function onSubmit(values: LeaveFormValues) {
    const days = calcDays(values.start_date, values.end_date);
    if (days <= 0) {
      form.setError("end_date", { message: "Ngày kết thúc phải sau ngày bắt đầu" });
      return;
    }

    // Tìm loại phép
    const leaveType = leaveTypes.find((t) => t.id === values.leave_type_id);

    // Nghỉ phép năm (is_paid = true) → kiểm tra allocation
    if (leaveType?.is_paid) {
      const alloc = allocations.find((a) => a.leave_type_id === values.leave_type_id);
      const remaining = alloc?.remaining_days ?? 0;
      if (remaining < days) {
        form.setError("end_date", { message: `Không đủ ngày phép. Còn lại: ${remaining}, yêu cầu: ${days}` });
        return;
      }
    }

    // Kiểm tra chồng ngày với đơn pending/approved (của chính mình)
    const myLeaves = leaves.filter((l) => l.employee_id === employee?.id);
    const overlap = myLeaves.find(
      (l) =>
        l.status !== "rejected" && l.status !== "cancelled" &&
        values.start_date <= l.end_date && values.end_date >= l.start_date
    );
    if (overlap) {
      form.setError("start_date", { message: `Trùng ngày với đơn ${formatDate(overlap.start_date)} - ${formatDate(overlap.end_date)}` });
      return;
    }

    createLeave.mutate(
      {
        ...values,
        employee_id: employee!.id,
        days,
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi đơn nghỉ phép");
          setModalOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function confirmApprove() {
    if (!approveTarget) return;

    // Kiểm tra chồng ngày với đơn đã duyệt khác của cùng NV
    const overlap = leaves.find(
      (l) =>
        l.id !== approveTarget.id &&
        l.employee_id === approveTarget.employee_id &&
        l.status === "approved" &&
        approveTarget.start_date <= l.end_date && approveTarget.end_date >= l.start_date
    );
    if (overlap) {
      toast.error(`Trùng ngày với đơn nghỉ đã duyệt ${formatDate(overlap.start_date)} - ${formatDate(overlap.end_date)}`);
      setApproveTarget(null);
      return;
    }

    approveLeave.mutate(
      { id: approveTarget.id, approverId: employee!.id },
      {
        onSuccess: () => { toast.success("Đã duyệt đơn nghỉ phép"); setApproveTarget(null); },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function handleReject() {
    if (!rejectTarget || !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    rejectLeave.mutate(
      { id: rejectTarget.id, reason: rejectionReason, approverId: employee!.id },
      {
        onSuccess: () => {
          toast.success("Đã từ chối đơn nghỉ phép");
          setRejectTarget(null);
          setRejectionReason("");
        },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function confirmCancel() {
    if (!cancelTarget) return;
    cancelLeave.mutate(cancelTarget, {
      onSuccess: () => {
        toast.success("Đã huỷ đơn");
        setCancelTarget(null);
      },
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  const leaveTypeOptions = leaveTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const columns = useMemo(() => {
    const cols: Column<LeaveWithRels>[] = [];

    if (isManager) {
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
        header: "Loại phép",
        cell: (row) => (
          <span className="text-foreground">
            {row.leave_type?.name}
            {row.leave_type?.is_paid && (
              <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                (có lương)
              </span>
            )}
          </span>
        ),
      },
      {
        header: "Từ ngày",
        cell: (row) => (
          <span className="text-muted-foreground">{formatDate(row.start_date)}</span>
        ),
      },
      {
        header: "Đến ngày",
        cell: (row) => (
          <span className="text-muted-foreground">{formatDate(row.end_date)}</span>
        ),
      },
      {
        header: "Số ngày",
        cell: (row) => <span className="font-medium text-foreground">{row.days}</span>,
      },
      {
        header: "Lý do",
        cell: (row) => (
          <span className="text-muted-foreground max-w-xs truncate block">{row.reason}</span>
        ),
      },
      {
        header: "Trạng thái",
        cell: (row) => (
          <Badge variant={statusMap[row.status]?.variant}>
            {statusMap[row.status]?.label}
          </Badge>
        ),
      },
      {
        header: "Thao tác",
        cell: (row) => (
          <div className="flex items-center gap-1">
            {isManager && row.status === "pending" && (
              <>
                <button
                  onClick={() => setApproveTarget(row)}
                  className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-600 dark:text-green-400 transition"
                  title="Duyệt"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setRejectTarget(row)}
                  className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition"
                  title="Từ chối"
                >
                  <X size={14} />
                </button>
              </>
            )}
            {!isManager && row.status === "pending" && (
              <button
                onClick={() => setCancelTarget(row.id)}
                className="text-xs text-destructive hover:underline"
              >
                Huỷ
              </button>
            )}
          </div>
        ),
      }
    );

    return cols;
  }, [isManager, employee?.id]);

  return (
    <div className="space-y-5">
      {/* Allocation summary */}
      {allocations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allocations.map((alloc) => (
            <div
              key={alloc.id}
              className="bg-card rounded-xl ring-1 ring-border p-4"
            >
              <p className="text-xs text-muted-foreground">
                {(alloc as LeaveAllocation & { leave_type?: { name: string } }).leave_type?.name}
              </p>
              <p className="text-xl font-bold text-primary mt-1">
                {alloc.remaining_days}
              </p>
              <p className="text-xs text-muted-foreground">
                / {alloc.total_days} ngày còn lại
              </p>
              <div className="mt-2 h-1.5 bg-muted rounded-full">
                <div
                  className="h-1.5 bg-primary rounded-full"
                  style={{
                    width: `${(alloc.remaining_days / alloc.total_days) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar with tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex items-center gap-2">
          <TabsList className="flex-1">
            <TabsTrigger value="all">
              Tất cả{" "}
              <span className="ml-1.5 text-xs opacity-70">{leaves.length}</span>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Chờ duyệt{" "}
              <span className="ml-1.5 text-xs opacity-70">
                {leaves.filter((l) => l.status === "pending").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Đã duyệt{" "}
              <span className="ml-1.5 text-xs opacity-70">
                {leaves.filter((l) => l.status === "approved").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Từ chối{" "}
              <span className="ml-1.5 text-xs opacity-70">
                {leaves.filter((l) => l.status === "rejected").length}
              </span>
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => {
              form.reset();
              setModalOpen(true);
            }}
            leftIcon={<Plus size={14} />}
            size="sm"
          >
            Tạo đơn nghỉ
          </Button>
        </div>

        {/* Table */}
        <TabsContent value={filterStatus} forceMount>
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyState={{
              icon: CalendarOff,
              title: "Chưa có đơn nghỉ phép",
              action: (
                <Button
                  onClick={() => setModalOpen(true)}
                  leftIcon={<Plus size={14} />}
                  size="sm"
                >
                  Tạo đơn ngay
                </Button>
              ),
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo đơn nghỉ phép"
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <Controller
            control={form.control}
            name="leave_type_id"
            render={({ field }) => (
              <FormField
                label="Loại nghỉ phép"
                required
                error={form.formState.errors.leave_type_id?.message}
              >
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Chọn loại phép"
                  options={[{ value: "", label: "Chọn loại phép" }, ...leaveTypeOptions]}
                />
              </FormField>
            )}
          />
          {(() => {
            const selectedTypeId = form.watch("leave_type_id");
            const selectedType = leaveTypes.find((t) => t.id === selectedTypeId);
            if (!selectedType) return null;
            if (selectedType.is_paid) {
              const alloc = allocations.find((a) => a.leave_type_id === selectedTypeId);
              const remaining = alloc?.remaining_days ?? 0;
              return (
                <p className={`text-xs px-1 -mt-1 ${remaining > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  Còn lại: {remaining}/{alloc?.total_days ?? 0} ngày
                </p>
              );
            }
            return <p className="text-xs text-muted-foreground px-1 -mt-1">Không giới hạn số ngày</p>;
          })()}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Từ ngày"
              required
              error={form.formState.errors.start_date?.message}
            >
              <input
                type="date"
                {...form.register("start_date")}
                className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
            <FormField
              label="Đến ngày"
              required
              error={form.formState.errors.end_date?.message}
            >
              <input
                type="date"
                {...form.register("end_date")}
                className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </div>

          {watchStartDate && watchEndDate && (() => {
            const days = calcDays(watchStartDate, watchEndDate);
            const selectedType = leaveTypes.find((t) => t.id === form.watch("leave_type_id"));
            const alloc = allocations.find((a) => a.leave_type_id === form.watch("leave_type_id"));
            const isOverLimit = selectedType?.is_paid && alloc && days > alloc.remaining_days;
            return (
              <div className="space-y-1">
                <p className={`text-sm ${days <= 0 ? "text-red-600" : "text-primary"}`}>
                  Số ngày nghỉ: <strong>{days}</strong>
                </p>
                {days <= 0 && <p className="text-xs text-red-600">Ngày kết thúc phải sau ngày bắt đầu</p>}
                {isOverLimit && <p className="text-xs text-red-600">Vượt quá số ngày phép còn lại ({alloc.remaining_days} ngày)</p>}
              </div>
            );
          })()}

          <FormField label="Lý do" required error={form.formState.errors.reason?.message}>
            <textarea
              {...form.register("reason")}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" loading={createLeave.isPending}>
              Gửi đơn
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Từ chối đơn nghỉ phép"
        size="sm"
      >
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Nhân viên: <strong className="text-foreground">{rejectTarget?.employee?.full_name}</strong>
          </p>
          <FormField label="Lý do từ chối" required>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="secondary" onClick={() => setRejectTarget(null)}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={handleReject} loading={rejectLeave.isPending}>
            Từ chối
          </Button>
        </div>
      </Modal>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Duyệt đơn nghỉ phép?"
        description={`Duyệt đơn nghỉ ${approveTarget?.days} ngày của ${approveTarget?.employee?.full_name || "nhân viên"}?`}
        confirmText="Duyệt"
        onConfirm={confirmApprove}
        loading={approveLeave.isPending}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Huỷ đơn nghỉ phép này?"
        description="Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Huỷ đơn"
        onConfirm={confirmCancel}
        loading={cancelLeave.isPending}
      />
    </div>
  );
}
