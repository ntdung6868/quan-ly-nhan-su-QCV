"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Calendar, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Shift } from "@/types/database";

const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function ShiftsPage() {
  const supabase = createClient();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form, setForm] = useState<Partial<Shift>>({ working_days: [1, 2, 3, 4, 5] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from("shifts").select("*").order("name");
    setShifts(data || []);
    setIsLoading(false);
  }

  function toggleDay(day: number) {
    const days = form.working_days || [];
    if (days.includes(day)) {
      setForm({ ...form, working_days: days.filter((d) => d !== day) });
    } else {
      setForm({ ...form, working_days: [...days, day].sort() });
    }
  }

  async function handleSave() {
    if (!form.name || !form.start_time || !form.end_time) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    setIsSaving(true);
    try {
      if (editingShift) {
        await supabase.from("shifts").update(form).eq("id", editingShift.id);
        toast.success("Cập nhật ca làm thành công");
      } else {
        await supabase.from("shifts").insert(form as Shift);
        toast.success("Thêm ca làm thành công");
      }
      setModalOpen(false);
      loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá ca làm này?")) return;
    await supabase.from("shifts").delete().eq("id", id);
    toast.success("Đã xoá");
    loadData();
  }

  function getWorkHours(start: string, end: string, breakMin: number): string {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
    return `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? totalMin % 60 + "m" : ""}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingShift(null); setForm({ working_days: [1, 2, 3, 4, 5], break_minutes: 60 }); setModalOpen(true); }}
          leftIcon={<Plus size={14} />} size="sm">Thêm ca làm</Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Đang tải...</div>
      ) : shifts.length === 0 ? (
        <EmptyState icon={Calendar} title="Chưa có ca làm nào" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {shift.name}
                    {shift.is_default && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Mặc định</span>}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {shift.start_time} – {shift.end_time}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {getWorkHours(shift.start_time, shift.end_time, shift.break_minutes)} làm việc
                    {shift.break_minutes > 0 && ` (nghỉ ${shift.break_minutes}p)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingShift(shift); setForm({ ...shift }); setModalOpen(true); }}
                    className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(shift.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400 transition"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <span key={day} className={`text-xs px-1.5 py-1 rounded font-medium ${
                    (shift.working_days || []).includes(day) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                  }`}>{dayNames[day]}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingShift ? "Cập nhật ca làm" : "Thêm ca làm"} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên ca *</label>
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu *</label>
              <input type="time" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc *</label>
              <input type="time" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian nghỉ (phút)</label>
            <input type="number" value={form.break_minutes || 0} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngày làm việc</label>
            <div className="flex gap-1.5 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button key={day} onClick={() => toggleDay(day)} type="button"
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition ${
                    (form.working_days || []).includes(day) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{dayNames[day]}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_default || false} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded" />
            <span className="text-sm text-gray-700">Ca mặc định</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>{editingShift ? "Cập nhật" : "Thêm mới"}</Button>
        </div>
      </Modal>
    </div>
  );
}
