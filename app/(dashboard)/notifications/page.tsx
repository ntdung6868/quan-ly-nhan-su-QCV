"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell, Megaphone, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Notification, Announcement, Employee } from "@/types/database";

type AnnouncementWithAuthor = Announcement & { author?: { full_name: string } };

export default function NotificationsPage() {
  const { profile, employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([]);
  const [activeTab, setActiveTab] = useState<"notifications" | "announcements">("notifications");
  const [isLoading, setIsLoading] = useState(true);
  const [announcModalOpen, setAnnouncModalOpen] = useState(false);
  const [announcForm, setAnnouncForm] = useState<Partial<Announcement>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel("realtime-notifications")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
        toast.info((payload.new as Notification).title);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  async function loadData() {
    if (!profile?.id) return;
    setIsLoading(true);
    const [notifRes, announcRes] = await Promise.all([
      supabase.from("notifications").select("*").eq("user_id", profile.id)
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("announcements").select("*, author:employees(full_name)")
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setNotifications(notifRes.data || []);
    setAnnouncements(announcRes.data || []);
    setIsLoading(false);
  }

  async function markAllRead() {
    if (!profile?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("Đã đánh dấu tất cả đã đọc");
  }

  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleCreateAnnouncement() {
    if (!announcForm.title || !announcForm.content || !employee?.id) return;
    setIsSaving(true);
    const { error } = await supabase.from("announcements").insert({
      ...announcForm,
      created_by: employee.id,
    } as Announcement);
    setIsSaving(false);
    if (error) { toast.error("Lỗi tạo thông báo"); return; }
    toast.success("Đã đăng thông báo nội bộ");
    setAnnouncModalOpen(false);
    setAnnouncForm({});
    loadData();
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Xoá thông báo này?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success("Đã xoá");
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
        <button onClick={() => setActiveTab("notifications")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "notifications" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
          <Bell size={15} />
          Thông báo cá nhân
          {unreadCount > 0 && (
            <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-bold",
              activeTab === "notifications" ? "bg-blue-500 text-white" : "bg-red-100 text-red-600")}>
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab("announcements")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "announcements" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
          <Megaphone size={15} />
          Thông báo nội bộ
        </button>
      </div>

      {activeTab === "notifications" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Thông báo của bạn</h3>
            {unreadCount > 0 && (
              <Button onClick={markAllRead} variant="ghost" size="sm" leftIcon={<Check size={14} />}>
                Đánh dấu đã đọc
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Đang tải...</div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Chưa có thông báo nào" />
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif) => (
                <div key={notif.id} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition",
                  !notif.is_read && "bg-blue-50/40")}>
                  <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    notif.type === "success" ? "bg-green-500" :
                    notif.type === "error" ? "bg-red-500" :
                    notif.type === "warning" ? "bg-yellow-500" : "bg-blue-500")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium text-gray-800", !notif.is_read && "font-semibold")}>{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.created_at)}</p>
                  </div>
                  <button onClick={() => deleteNotif(notif.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "announcements" && (
        <>
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => { setAnnouncForm({ is_pinned: false }); setAnnouncModalOpen(true); }}
                leftIcon={<Plus size={14} />} size="sm">Đăng thông báo</Button>
            </div>
          )}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-gray-400 py-8">Đang tải...</div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Chưa có thông báo nội bộ" />
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.is_pinned && <span className="text-xs text-blue-600 font-medium">📌 Ghim</span>}
                        <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{a.content}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span>{a.author?.full_name || "Admin"}</span>
                        <span>{formatDateTime(a.created_at)}</span>
                        {a.expires_at && <span>Hết hạn: {formatDateTime(a.expires_at)}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deleteAnnouncement(a.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-400 transition flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <Modal open={announcModalOpen} onClose={() => setAnnouncModalOpen(false)} title="Đăng thông báo nội bộ" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
            <input value={announcForm.title || ""} onChange={(e) => setAnnouncForm({ ...announcForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
            <textarea value={announcForm.content || ""} onChange={(e) => setAnnouncForm({ ...announcForm, content: e.target.value })}
              rows={5} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hết hạn (tuỳ chọn)</label>
            <input type="datetime-local" value={announcForm.expires_at ? announcForm.expires_at.slice(0, 16) : ""}
              onChange={(e) => setAnnouncForm({ ...announcForm, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={announcForm.is_pinned || false}
              onChange={(e) => setAnnouncForm({ ...announcForm, is_pinned: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-700">Ghim thông báo</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setAnnouncModalOpen(false)}>Huỷ</Button>
          <Button loading={isSaving} onClick={handleCreateAnnouncement}>Đăng</Button>
        </div>
      </Modal>
    </div>
  );
}
