"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Building2, Plus, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Department, Employee } from "@/types/database";

type DeptWithManager = Department & { manager?: Employee; _count?: { employees: number } };

export default function DepartmentsPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<DeptWithManager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DeptWithManager | null>(null);
  const [form, setForm] = useState<Partial<Department>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const [deptRes, empRes] = await Promise.all([
      supabase.from("departments").select("*, manager:employees(id,full_name)").order("name"),
      supabase.from("employees").select("id,full_name,department_id").eq("status", "active"),
    ]);
    setDepartments(deptRes.data as DeptWithManager[] || []);
    setEmployees(empRes.data as Employee[] || []);

    const counts: Record<string, number> = {};
    (empRes.data || []).forEach((e) => {
      if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1;
    });
    setEmpCounts(counts);
    setIsLoading(false);
  }

  function openCreate() {
    setEditingDept(null);
    setForm({});
    setModalOpen(true);
  }

  function openEdit(dept: DeptWithManager) {
    setEditingDept(dept);
    setForm({ ...dept });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) { toast.error("Vui lòng nhập tên và mã phòng ban"); return; }
    setIsSaving(true);
    try {
      if (editingDept) {
        const { error } = await supabase.from("departments").update(form).eq("id", editingDept.id);
        if (error) throw error;
        toast.success("Cập nhật phòng ban thành công");
      } else {
        const { error } = await supabase.from("departments").insert(form as Department);
        if (error) throw error;
        toast.success("Thêm phòng ban thành công");
      }
      setModalOpen(false);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(dept: DeptWithManager) {
    if ((empCounts[dept.id] || 0) > 0) {
      toast.error("Không thể xoá phòng ban còn nhân viên");
      return;
    }
    if (!confirm(`Xoá phòng ban "${dept.name}"?`)) return;
    await supabase.from("departments").delete().eq("id", dept.id);
    toast.success("Đã xoá phòng ban");
    loadData();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm phòng ban</Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Đang tải...</div>
      ) : departments.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có phòng ban nào"
          action={<Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngay</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(dept)} className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(dept)} className="p-1.5 hover:bg-red-50 rounded text-red-400 transition"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{dept.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{dept.code}</p>
              {dept.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{dept.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{empCounts[dept.id] || 0} nhân viên</span>
                </div>
                {dept.manager && (
                  <span className="text-xs text-gray-400">QL: {dept.manager.full_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingDept ? "Cập nhật phòng ban" : "Thêm phòng ban"} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng ban *</label>
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã phòng ban *</label>
            <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trưởng phòng</label>
            <select value={form.manager_id || ""} onChange={(e) => setForm({ ...form, manager_id: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chưa chọn</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>{editingDept ? "Cập nhật" : "Thêm mới"}</Button>
        </div>
      </Modal>
    </div>
  );
}
