"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { CheckSquare, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, Employee, Department } from "@/types/database";

type TaskWithRels = Task & {
  assignee?: { full_name: string };
  department?: { name: string };
};

const statusMap: Record<Task["status"], { label: string; variant: "default" | "info" | "success" | "error" | "warning" }> = {
  todo: { label: "Chờ xử lý", variant: "default" },
  in_progress: { label: "Đang làm", variant: "info" },
  done: { label: "Hoàn thành", variant: "success" },
  cancelled: { label: "Huỷ", variant: "error" },
};

const priorityMap: Record<Task["priority"], { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-gray-500" },
  medium: { label: "Vừa", color: "text-yellow-600" },
  high: { label: "Cao", color: "text-orange-600" },
  urgent: { label: "Khẩn cấp", color: "text-red-600" },
};

export default function TasksPage() {
  const { employee, isManager } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskWithRels[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRels | null>(null);
  const [form, setForm] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, [employee?.id]);

  async function loadData() {
    if (!employee?.id) return;
    setIsLoading(true);
    let query = supabase.from("tasks")
      .select("*, assignee:employees!assigned_to(full_name), department:departments(name)")
      .order("created_at", { ascending: false });

    if (!isManager) {
      query = query.or(`assigned_to.eq.${employee.id},assigned_by.eq.${employee.id}`);
    }
    const { data } = await query;
    setTasks(data || []);

    if (isManager) {
      const [empRes, deptRes] = await Promise.all([
        supabase.from("employees").select("id,full_name").eq("status", "active"),
        supabase.from("departments").select("id,name"),
      ]);
      setEmployees(empRes.data as Employee[] || []);
      setDepartments(deptRes.data as Department[] || []);
    }
    setIsLoading(false);
  }

  function openCreate() {
    setEditingTask(null);
    setForm({ status: "todo", priority: "medium", assigned_by: employee?.id });
    setModalOpen(true);
  }

  function openEdit(task: TaskWithRels) {
    setEditingTask(task);
    setForm({ ...task });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title) { toast.error("Vui lòng nhập tiêu đề"); return; }
    setIsSaving(true);
    try {
      if (editingTask) {
        const { error } = await supabase.from("tasks").update(form).eq("id", editingTask.id);
        if (error) throw error;
        toast.success("Cập nhật thành công");
      } else {
        const { error } = await supabase.from("tasks").insert(form as Task);
        if (error) throw error;
        toast.success("Tạo công việc thành công");
      }
      setModalOpen(false);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(id: string, status: Task["status"]) {
    const update: Partial<Task> = { status };
    if (status === "done") update.completed_at = new Date().toISOString();
    await supabase.from("tasks").update(update).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...update } : t));
    toast.success("Cập nhật trạng thái thành công");
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá công việc này?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Đã xoá");
  }

  const filtered = tasks.filter((t) => !filterStatus || t.status === filterStatus);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-5">
      {/* Status filter tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1 flex-wrap">
        {[
          { key: "", label: "Tất cả", count: counts.all },
          { key: "todo", label: "Chờ xử lý", count: counts.todo },
          { key: "in_progress", label: "Đang làm", count: counts.in_progress },
          { key: "done", label: "Hoàn thành", count: counts.done },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterStatus === tab.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterStatus === tab.key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
            }`}>{tab.count}</span>
          </button>
        ))}
        <div className="flex-1" />
        {isManager && <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Tạo công việc</Button>}
      </div>

      {/* Tasks */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Không có công việc nào"
          action={isManager ? <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Tạo ngay</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${priorityMap[task.priority].color}`}>
                      ● {priorityMap[task.priority].label}
                    </span>
                    <Badge variant={statusMap[task.status]?.variant}>{statusMap[task.status]?.label}</Badge>
                    {task.department && <span className="text-xs text-gray-400">{task.department.name}</span>}
                  </div>
                  <h3 className="font-medium text-gray-800 mt-1">{task.title}</h3>
                  {task.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {task.assignee && <span>Phân công: {task.assignee.full_name}</span>}
                    {task.due_date && <span>Hạn: {formatDate(task.due_date)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {task.status !== "done" && task.status !== "cancelled" && (
                    <button onClick={() => updateStatus(task.id, task.status === "todo" ? "in_progress" : "done")}
                      className="p-1.5 hover:bg-green-50 rounded text-green-600 transition text-xs font-medium px-2">
                      {task.status === "todo" ? "Bắt đầu" : "Hoàn thành"}
                    </button>
                  )}
                  {isManager && (
                    <>
                      <button onClick={() => openEdit(task)} className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400 transition"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingTask ? "Cập nhật công việc" : "Tạo công việc mới"} size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
            <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ưu tiên</label>
              <select value={form.priority || "medium"} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Thấp</option>
                <option value="medium">Vừa</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select value={form.status || "todo"} onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="todo">Chờ xử lý</option>
                <option value="in_progress">Đang làm</option>
                <option value="done">Hoàn thành</option>
                <option value="cancelled">Huỷ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phân công cho</label>
              <select value={form.assigned_to || ""} onChange={(e) => setForm({ ...form, assigned_to: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Chọn nhân viên</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hạn hoàn thành</label>
              <input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>{editingTask ? "Cập nhật" : "Tạo mới"}</Button>
        </div>
      </Modal>
    </div>
  );
}
