"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FileText, Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";
import type { Contract, Employee } from "@/types/database";

type ContractWithEmployee = Contract & { employee?: { full_name: string; employee_code: string } };

const statusMap = {
  active: { label: "Hiệu lực", variant: "success" as const },
  expired: { label: "Hết hạn", variant: "warning" as const },
  terminated: { label: "Chấm dứt", variant: "error" as const },
};

const typeMap = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  probation: "Thử việc",
  intern: "Thực tập",
};

export default function ContractsPage() {
  const { employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithEmployee | null>(null);
  const [form, setForm] = useState<Partial<Contract>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, [employee?.id]);

  async function loadData() {
    if (!employee?.id) return;
    setIsLoading(true);
    let q = supabase.from("contracts")
      .select("*, employee:employees(full_name,employee_code)")
      .order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("employee_id", employee.id);

    const [contractsRes, empRes] = await Promise.all([
      q,
      isAdmin ? supabase.from("employees").select("id,full_name").eq("status", "active") : Promise.resolve({ data: [] as Employee[] }),
    ]);
    setContracts(contractsRes.data as ContractWithEmployee[] || []);
    setEmployees(empRes.data as Employee[] || []);
    setIsLoading(false);
  }

  async function handleSave() {
    if (!form.employee_id || !form.type || !form.start_date) { toast.error("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    setIsSaving(true);
    try {
      if (editingContract) {
        const { error } = await supabase.from("contracts").update(form).eq("id", editingContract.id);
        if (error) throw error;
        toast.success("Cập nhật hợp đồng thành công");
      } else {
        const num = `HD${Date.now().toString().slice(-6)}`;
        const { error } = await supabase.from("contracts").insert({ ...form, contract_number: num } as Contract);
        if (error) throw error;
        toast.success("Tạo hợp đồng thành công");
      }
      setModalOpen(false);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingContract(null); setForm({ status: "active", type: "full_time" }); setModalOpen(true); }}
            leftIcon={<Plus size={14} />} size="sm">Tạo hợp đồng</Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : contracts.length === 0 ? (
          <EmptyState icon={FileText} title="Chưa có hợp đồng nào" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Số HĐ</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Loại</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày bắt đầu</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày kết thúc</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Lương</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-gray-500 font-medium">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.contract_number}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{c.employee?.full_name}</p>
                        <p className="text-xs text-gray-400">{c.employee?.employee_code}</p>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700">{typeMap[c.type]}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.start_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.end_date ? formatDate(c.end_date) : "Không xác định"}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{formatCurrency(c.base_salary)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[c.status]?.variant}>{statusMap[c.status]?.label}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => { setEditingContract(c); setForm({ ...c }); setModalOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition"><Edit2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingContract ? "Cập nhật hợp đồng" : "Tạo hợp đồng mới"} size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên *</label>
            <select value={form.employee_id || ""} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn nhân viên</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại hợp đồng *</label>
              <select value={form.type || "full_time"} onChange={(e) => setForm({ ...form, type: e.target.value as Contract["type"] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(typeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value as Contract["status"] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Hiệu lực</option>
                <option value="expired">Hết hạn</option>
                <option value="terminated">Chấm dứt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
              <input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
              <input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản (VNĐ)</label>
            <input type="number" value={form.base_salary || 0} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>{editingContract ? "Cập nhật" : "Tạo mới"}</Button>
        </div>
      </Modal>
    </div>
  );
}
