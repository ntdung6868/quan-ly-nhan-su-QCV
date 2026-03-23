"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Leave, LeaveType, LeaveAllocation } from "@/types/database";

type LeaveWithRels = Leave & {
  leave_type?: { name: string; is_paid: boolean };
  employee?: { full_name: string };
};

const statusMap = {
  pending: { label: "Chờ duyệt", variant: "warning" as const },
  approved: { label: "Đã duyệt", variant: "success" as const },
  rejected: { label: "Từ chối", variant: "error" as const },
  cancelled: { label: "Huỷ", variant: "secondary" as const },
};

export default function LeavesPage() {
  const { employee, isManager } = useAuth();
  const supabase = createClient();
  const [leaves, setLeaves] = useState<LeaveWithRels[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveWithRels | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [form, setForm] = useState<Partial<Leave>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, [employee?.id]);

  async function loadData() {
    if (!employee?.id) return;
    setIsLoading(true);
    let query = supabase.from("leaves")
      .select("*, leave_type:leave_types(name,is_paid), employee:employees(full_name)")
      .order("created_at", { ascending: false });
    if (!isManager) query = query.eq("employee_id", employee.id);

    const [leavesRes, typesRes, allocRes] = await Promise.all([
      query,
      supabase.from("leave_types").select("*"),
      supabase.from("leave_allocations").select("*, leave_type:leave_types(name)")
        .eq("employee_id", employee.id).eq("year", new Date().getFullYear()),
    ]);
    setLeaves(leavesRes.data || []);
    setLeaveTypes(typesRes.data || []);
    setAllocations(allocRes.data || []);
    setIsLoading(false);
  }

  function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  async function handleSubmit() {
    if (!form.leave_type_id || !form.start_date || !form.end_date || !form.reason) {
      toast.error("Vui lòng điền đầy đủ thông tin"); return;
    }
    setIsSaving(true);
    try {
      const days = calcDays(form.start_date, form.end_date);
      const { error } = await supabase.from("leaves").insert({
        ...form,
        employee_id: employee!.id,
        days,
        status: "pending",
      } as Leave);
      if (error) throw error;
      toast.success("Đã gửi đơn nghỉ phép");
      setModalOpen(false);
      loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Lỗi");
    } finally {
      setIsSaving(false);
    }
  }

  async function approve(leave: LeaveWithRels) {
    await supabase.from("leaves").update({
      status: "approved",
      approved_by: employee?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", leave.id);
    toast.success("Đã duyệt đơn nghỉ phép");
    loadData();
  }

  async function reject() {
    if (!selectedLeave || !rejectionReason.trim()) { toast.error("Vui lòng nhập lý do từ chối"); return; }
    await supabase.from("leaves").update({
      status: "rejected",
      approved_by: employee?.id,
      rejection_reason: rejectionReason,
    }).eq("id", selectedLeave.id);
    toast.success("Đã từ chối đơn nghỉ phép");
    setRejectModalOpen(false);
    setRejectionReason("");
    loadData();
  }

  async function cancel(id: string) {
    if (!confirm("Huỷ đơn nghỉ phép này?")) return;
    await supabase.from("leaves").update({ status: "cancelled" }).eq("id", id);
    toast.success("Đã huỷ đơn");
    loadData();
  }

  const filtered = leaves.filter((l) => !filterStatus || l.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Allocation summary */}
      {allocations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allocations.map((alloc) => (
            <div key={alloc.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{(alloc as LeaveAllocation & { leave_type?: { name: string } }).leave_type?.name}</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{alloc.remaining_days}</p>
              <p className="text-xs text-gray-400">/ {alloc.total_days} ngày còn lại</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-1.5 bg-blue-500 rounded-full"
                  style={{ width: `${(alloc.remaining_days / alloc.total_days) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterStatus === s ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {s === "" ? "Tất cả" : statusMap[s as Leave["status"]]?.label}
            <span className={`ml-1.5 text-xs ${filterStatus === s ? "text-blue-200" : "text-gray-400"}`}>
              {s === "" ? leaves.length : leaves.filter((l) => l.status === s).length}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <Button onClick={() => { setForm({}); setModalOpen(true); }} leftIcon={<Plus size={14} />} size="sm">Tạo đơn nghỉ</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarOff} title="Chưa có đơn nghỉ phép"
            action={<Button onClick={() => setModalOpen(true)} leftIcon={<Plus size={14} />} size="sm">Tạo đơn ngay</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {isManager && <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Loại phép</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Từ ngày</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Đến ngày</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Số ngày</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Lý do</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    {isManager && <td className="px-4 py-3 font-medium text-gray-800">{leave.employee?.full_name || "—"}</td>}
                    <td className="px-4 py-3 text-gray-700">
                      {leave.leave_type?.name}
                      {leave.leave_type?.is_paid && <span className="ml-1 text-xs text-green-600">(có lương)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(leave.start_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(leave.end_date)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{leave.days}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[leave.status]?.variant}>{statusMap[leave.status]?.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isManager && leave.status === "pending" && (
                          <>
                            <button onClick={() => approve(leave)} className="p-1.5 hover:bg-green-50 rounded text-green-600 transition" title="Duyệt"><Check size={14} /></button>
                            <button onClick={() => { setSelectedLeave(leave); setRejectModalOpen(true); }} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition" title="Từ chối"><X size={14} /></button>
                          </>
                        )}
                        {!isManager && leave.status === "pending" && (
                          <button onClick={() => cancel(leave.id)} className="text-xs text-red-500 hover:underline">Huỷ</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo đơn nghỉ phép" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại nghỉ phép *</label>
            <select value={form.leave_type_id || ""} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn loại phép</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày *</label>
              <input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày *</label>
              <input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {form.start_date && form.end_date && (
            <p className="text-sm text-blue-600">Số ngày nghỉ: <strong>{calcDays(form.start_date, form.end_date)}</strong></p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do *</label>
            <textarea value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSubmit}>Gửi đơn</Button>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Từ chối đơn nghỉ phép" size="sm">
        <div>
          <p className="text-sm text-gray-600 mb-3">Nhân viên: <strong>{selectedLeave?.employee?.full_name}</strong></p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối *</label>
          <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Huỷ</Button>
          <Button variant="danger" onClick={reject}>Từ chối</Button>
        </div>
      </Modal>
    </div>
  );
}
