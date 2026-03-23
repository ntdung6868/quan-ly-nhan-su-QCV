"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Employee, Department, Shift } from "@/types/database";

type EmployeeWithRels = Employee & {
  department?: Department;
  shift?: Shift;
};

const statusMap = {
  active: { label: "Đang làm", variant: "success" as const },
  inactive: { label: "Nghỉ việc", variant: "error" as const },
  on_leave: { label: "Đang nghỉ", variant: "warning" as const },
};

export default function EmployeesPage() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<EmployeeWithRels[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRels | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [empRes, deptRes, shiftRes] = await Promise.all([
      supabase.from("employees").select("*, department:departments(id,name), shift:shifts(id,name)")
        .order("full_name"),
      supabase.from("departments").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
    ]);
    setEmployees(empRes.data || []);
    setDepartments(deptRes.data || []);
    setShifts(shiftRes.data || []);
    setIsLoading(false);
  }

  function openCreate() {
    setEditingEmployee(null);
    setForm({ status: "active", hire_date: new Date().toISOString().split("T")[0] });
    setModalOpen(true);
  }

  function openEdit(emp: EmployeeWithRels) {
    setEditingEmployee(emp);
    setForm({ ...emp });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.full_name || !form.email || !form.hire_date) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setIsSaving(true);
    try {
      if (editingEmployee) {
        const { error } = await supabase.from("employees").update(form).eq("id", editingEmployee.id);
        if (error) throw error;
        toast.success("Cập nhật nhân viên thành công");
      } else {
        const code = `EMP${String(Date.now()).slice(-5)}`;
        const { error } = await supabase.from("employees").insert({ ...form, employee_code: code } as Employee);
        if (error) throw error;
        toast.success("Thêm nhân viên thành công");
      }
      setModalOpen(false);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(emp: EmployeeWithRels) {
    if (!confirm(`Xoá nhân viên "${emp.full_name}"?`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) { toast.error("Không thể xoá nhân viên"); return; }
    toast.success("Đã xoá nhân viên");
    loadData();
  }

  const filtered = employees.filter((e) => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.employee_code.includes(search);
    const matchDept = !filterDept || e.department_id === filterDept;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhân viên..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang làm</option>
          <option value="inactive">Nghỉ việc</option>
          <option value="on_leave">Đang nghỉ</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} nhân viên</span>
        <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm nhân viên</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Không có nhân viên" action={<Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngay</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Mã NV</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Phòng ban</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Chức vụ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày vào</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Lương</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.full_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {getInitials(emp.full_name)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{emp.full_name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{emp.employee_code}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.position || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(emp.hire_date)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(emp.base_salary)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[emp.status]?.variant || "default"}>
                        {statusMap[emp.status]?.label || emp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(emp)} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingEmployee ? "Cập nhật nhân viên" : "Thêm nhân viên mới"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
            <input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
            <input value={form.position || ""} onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
            <select value={form.department_id || ""} onChange={(e) => setForm({ ...form, department_id: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn phòng ban</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ca làm việc</label>
            <select value={form.shift_id || ""} onChange={(e) => setForm({ ...form, shift_id: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn ca</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm *</label>
            <input type="date" value={form.hire_date || ""} onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản (VNĐ)</label>
            <input type="number" value={form.base_salary || 0} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value as Employee["status"] })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Đang làm việc</option>
              <option value="inactive">Nghỉ việc</option>
              <option value="on_leave">Đang nghỉ phép</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
            <select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value as Employee["gender"] })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>
            {editingEmployee ? "Cập nhật" : "Thêm mới"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
