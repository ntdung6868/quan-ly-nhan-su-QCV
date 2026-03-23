"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Holiday } from "@/types/database";

export default function HolidaysPage() {
  const supabase = createClient();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Holiday>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from("holidays").select("*").order("date");
    setHolidays(data || []);
    setIsLoading(false);
  }

  async function handleSave() {
    if (!form.name || !form.date) { toast.error("Vui lòng nhập tên và ngày"); return; }
    setIsSaving(true);
    const { error } = await supabase.from("holidays").insert(form as Holiday);
    setIsSaving(false);
    if (error) { toast.error("Lỗi thêm ngày lễ"); return; }
    toast.success("Đã thêm ngày lễ");
    setModalOpen(false);
    setForm({});
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá ngày lễ này?")) return;
    await supabase.from("holidays").delete().eq("id", id);
    toast.success("Đã xoá");
    loadData();
  }

  const grouped = holidays.reduce((acc, h) => {
    const year = new Date(h.date).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(h);
    return acc;
  }, {} as Record<string, Holiday[]>);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ is_recurring: false }); setModalOpen(true); }}
          leftIcon={<Plus size={14} />} size="sm">Thêm ngày lễ</Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Đang tải...</div>
      ) : holidays.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Chưa có ngày lễ nào" />
      ) : (
        Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, items]) => (
          <div key={year} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Năm {year} ({items.length} ngày)</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-center">
                      <p className="text-lg font-bold text-blue-600">{new Date(h.date).getDate()}</p>
                      <p className="text-xs text-gray-400">
                        Th.{new Date(h.date).getMonth() + 1}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{h.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{formatDate(h.date)}</span>
                        {h.is_recurring && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Hàng năm</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(h.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400 transition"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm ngày lễ" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngày lễ *</label>
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
            <input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring || false} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-700">Lặp lại hàng năm</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleSave}>Thêm</Button>
        </div>
      </Modal>
    </div>
  );
}
