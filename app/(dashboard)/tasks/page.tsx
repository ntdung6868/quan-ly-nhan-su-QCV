"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
  type TaskWithRels,
} from "@/hooks/use-tasks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckSquare, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Task, Employee, Department } from "@/types/database";

const statusMap: Record<
  Task["status"],
  { label: string; variant: "default" | "info" | "success" | "error" | "warning" }
> = {
  todo: { label: "Chờ xử lý", variant: "default" },
  in_progress: { label: "Đang làm", variant: "info" },
  done: { label: "Hoàn thành", variant: "success" },
  cancelled: { label: "Huỷ", variant: "error" },
};

const priorityMap: Record<Task["priority"], { label: string; className: string }> = {
  low: { label: "Thấp", className: "text-muted-foreground" },
  medium: { label: "Vừa", className: "text-yellow-600 dark:text-yellow-400" },
  high: { label: "Cao", className: "text-orange-600 dark:text-orange-400" },
  urgent: { label: "Khẩn cấp", className: "text-red-600 dark:text-red-400" },
};

const priorityOptions = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Vừa" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
];

const statusOptions = [
  { value: "todo", label: "Chờ xử lý" },
  { value: "in_progress", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
  { value: "cancelled", label: "Huỷ" },
];

export default function TasksPage() {
  const { employee, isManager } = useAuth();
  const supabase = createClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRels | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const statusFilter = filterStatus === "all" ? undefined : filterStatus;

  const { data: tasks = [], isLoading } = useTasks({
    employeeId: employee?.id,
    isManager,
  });

  const allTasks = tasks;
  const filtered = useMemo(
    () => (statusFilter ? allTasks.filter((t) => t.status === statusFilter) : allTasks),
    [allTasks, statusFilter]
  );

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigned_to: null,
      department_id: null,
      due_date: "",
    },
  });

  useEffect(() => {
    if (isManager) {
      Promise.all([
        supabase.from("employees").select("id,full_name").eq("status", "active"),
        supabase.from("departments").select("id,name"),
      ]).then(([empRes, deptRes]) => {
        setEmployees((empRes.data as Employee[]) || []);
        setDepartments((deptRes.data as Department[]) || []);
      });
    }
  }, [isManager]);

  const counts = useMemo(
    () => ({
      all: allTasks.length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      done: allTasks.filter((t) => t.status === "done").length,
    }),
    [allTasks]
  );

  function openCreate() {
    setEditingTask(null);
    form.reset({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigned_to: null,
      department_id: null,
      due_date: "",
    });
    setModalOpen(true);
  }

  function openEdit(task: TaskWithRels) {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      department_id: task.department_id,
      due_date: task.due_date || "",
    });
    setModalOpen(true);
  }

  function onSubmit(values: TaskFormValues) {
    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, ...values },
        {
          onSuccess: () => {
            toast.success("Cập nhật thành công");
            setModalOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message || "Lỗi"),
        }
      );
    } else {
      createTask.mutate(
        { ...values, assigned_by: employee?.id },
        {
          onSuccess: () => {
            toast.success("Tạo công việc thành công");
            setModalOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message || "Lỗi"),
        }
      );
    }
  }

  const [statusConfirm, setStatusConfirm] = useState<{ id: string; status: Task["status"] } | null>(null);
  function confirmStatusChange() {
    if (!statusConfirm) return;
    updateTaskStatus.mutate(
      { id: statusConfirm.id, status: statusConfirm.status },
      {
        onSuccess: () => { toast.success("Cập nhật trạng thái thành công"); setStatusConfirm(null); },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteTask.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success("Đã xoá");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.full_name,
  }));

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div className="space-y-5">
      {/* Status filter tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex items-center gap-2">
          <TabsList className="flex-1">
            <TabsTrigger value="all">
              Tất cả <span className="ml-1.5 text-xs opacity-70">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="todo">
              Chờ xử lý <span className="ml-1.5 text-xs opacity-70">{counts.todo}</span>
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              Đang làm <span className="ml-1.5 text-xs opacity-70">{counts.in_progress}</span>
            </TabsTrigger>
            <TabsTrigger value="done">
              Hoàn thành <span className="ml-1.5 text-xs opacity-70">{counts.done}</span>
            </TabsTrigger>
          </TabsList>
          {isManager && (
            <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">
              Tạo công việc
            </Button>
          )}
        </div>

        {/* Tasks list - shared across all tabs */}
        <TabsContent value={filterStatus} forceMount>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Không có công việc nào"
              action={
                isManager ? (
                  <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">
                    Tạo ngay
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((task) => (
                <div
                  key={task.id}
                  className="bg-card rounded-xl ring-1 ring-border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${priorityMap[task.priority].className}`}
                        >
                          ● {priorityMap[task.priority].label}
                        </span>
                        <Badge variant={statusMap[task.status]?.variant}>
                          {statusMap[task.status]?.label}
                        </Badge>
                        {task.department && (
                          <span className="text-xs text-muted-foreground">
                            {task.department.name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground mt-1">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {task.assignee && <span>Phân công: {task.assignee.full_name}</span>}
                        {task.due_date && <span>Hạn: {formatDate(task.due_date)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {task.status !== "done" && task.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            setStatusConfirm({
                              id: task.id,
                              status: task.status === "todo" ? "in_progress" : "done",
                            })
                          }
                          className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-600 dark:text-green-400 transition text-xs font-medium px-2"
                        >
                          {task.status === "todo" ? "Bắt đầu" : "Hoàn thành"}
                        </button>
                      )}
                      {isManager && (
                        <>
                          <button
                            onClick={() => openEdit(task)}
                            className="p-1.5 hover:bg-accent rounded text-blue-500 dark:text-blue-400 transition"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(task.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? "Cập nhật công việc" : "Tạo công việc mới"}
        size="md"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tiêu đề" required error={form.formState.errors.title?.message}>
            <input
              {...form.register("title")}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          <FormField label="Mô tả" error={form.formState.errors.description?.message}>
            <textarea
              {...form.register("description")}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormField label="Ưu tiên" error={form.formState.errors.priority?.message}>
                  <Select
                    key={`pri-${editingTask?.id ?? "new"}`}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    options={priorityOptions}
                  />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormField label="Trạng thái" error={form.formState.errors.status?.message}>
                  <Select
                    key={`st-${editingTask?.id ?? "new"}`}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    options={statusOptions}
                  />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormField label="Phân công cho">
                  <Select
                    key={`at-${editingTask?.id ?? "new"}`}
                    value={field.value || ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    placeholder="Chọn nhân viên"
                    options={[{ value: "", label: "Chọn nhân viên" }, ...employeeOptions]}
                  />
                </FormField>
              )}
            />

            <FormField label="Hạn hoàn thành">
              <input
                type="date"
                {...form.register("due_date")}
                className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              type="submit"
              loading={createTask.isPending || updateTask.isPending}
            >
              {editingTask ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xoá công việc này?"
        description="Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xoá"
        onConfirm={confirmDelete}
        loading={deleteTask.isPending}
      />

      {/* Status change confirm */}
      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        title={statusConfirm?.status === "in_progress" ? "Bắt đầu công việc?" : "Hoàn thành công việc?"}
        description={statusConfirm?.status === "in_progress" ? "Chuyển công việc sang trạng thái đang thực hiện?" : "Xác nhận công việc đã hoàn thành?"}
        confirmText={statusConfirm?.status === "in_progress" ? "Bắt đầu" : "Hoàn thành"}
        onConfirm={confirmStatusChange}
        loading={updateTaskStatus.isPending}
      />
    </div>
  );
}
