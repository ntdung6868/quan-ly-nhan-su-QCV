"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useNotifications,
  useAnnouncements,
  useMarkAllRead,
  useDeleteNotification,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementWithAuthor,
} from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime, cn } from "@/lib/utils";
import { announcementSchema, type AnnouncementFormValues } from "@/lib/validations/announcement";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Megaphone, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/database";

export default function NotificationsPage() {
  const { profile, employee, isAdmin } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [announcModalOpen, setAnnouncModalOpen] = useState(false);
  const [deleteAnnouncTarget, setDeleteAnnouncTarget] = useState<string | null>(null);
  const [deleteNotifTarget, setDeleteNotifTarget] = useState<string | null>(null);

  const { data: notifications = [], isLoading: notifLoading } = useNotifications(profile?.id);
  const { data: announcements = [], isLoading: announcLoading } = useAnnouncements();

  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    mode: "onChange",
    defaultValues: { title: "", content: "", is_pinned: false, expires_at: "" },
  });

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("realtime-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload: { new: unknown }) => {
          queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
          toast.info((payload.new as Notification).title);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  function getNotifRoute(title: string, link?: string | null): string {
    if (link) return link;
    if (title.includes("nghỉ phép")) return "/leaves";
    if (title.includes("Công việc") || title.includes("task")) return "/tasks";
    if (title.includes("lương") || title.includes("Lương")) return "/salary";
    return "/notifications";
  }

  async function handleNotifClick(notif: Notification) {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    const route = getNotifRoute(notif.title, notif.link);
    if (route !== "/notifications") router.push(route);
  }

  function handleMarkAllRead() {
    if (!profile?.id) return;
    markAllRead.mutate(profile.id, {
      onSuccess: () => toast.success("Đã đánh dấu tất cả đã đọc"),
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  function handleDeleteNotif() {
    if (!deleteNotifTarget) return;
    deleteNotification.mutate(deleteNotifTarget, {
      onSuccess: () => setDeleteNotifTarget(null),
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  function onSubmitAnnouncement(values: AnnouncementFormValues) {
    if (!employee?.id) return;
    createAnnouncement.mutate(
      { ...values, created_by: employee.id, expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : undefined },
      {
        onSuccess: () => { toast.success("Đã đăng thông báo nội bộ"); setAnnouncModalOpen(false); form.reset(); },
        onError: () => toast.error("Lỗi tạo thông báo"),
      }
    );
  }

  function confirmDeleteAnnouncement() {
    if (!deleteAnnouncTarget) return;
    deleteAnnouncement.mutate(deleteAnnouncTarget, {
      onSuccess: () => { toast.success("Đã xoá"); setDeleteAnnouncTarget(null); },
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="ghost" size="sm" leftIcon={<Check size={14} />} loading={markAllRead.isPending}>
              Đánh dấu đã đọc ({unreadCount})
            </Button>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => { form.reset(); setAnnouncModalOpen(true); }}
            leftIcon={<Plus size={14} />}
            size="sm"
          >
            Đăng thông báo nội bộ
          </Button>
        )}
      </div>

      {/* Thông báo nội bộ */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-card rounded-xl ring-1 ring-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Megaphone size={14} className="text-primary shrink-0" />
                    {a.is_pinned && <span className="text-xs text-primary font-medium">Ghim</span>}
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/70">
                    <span>{a.author?.full_name || "Admin"}</span>
                    <span>{formatDateTime(a.created_at)}</span>
                    {a.expires_at && <span>Hết hạn: {formatDateTime(a.expires_at)}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setDeleteAnnouncTarget(a.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thông báo cá nhân */}
      <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bell size={16} /> Thông báo cá nhân
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">{unreadCount}</span>
            )}
          </h3>
        </div>
        {notifLoading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Chưa có thông báo nào" />
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 hover:bg-accent transition cursor-pointer",
                  !notif.is_read && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2 shrink-0",
                  notif.type === "success" ? "bg-green-500"
                    : notif.type === "error" ? "bg-red-500"
                    : notif.type === "warning" ? "bg-yellow-500"
                    : "bg-blue-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium text-foreground", !notif.is_read && "font-semibold")}>{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{formatDateTime(notif.created_at)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteNotifTarget(notif.id); }}
                  className="text-muted-foreground/50 hover:text-destructive transition shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create announcement modal */}
      <Modal open={announcModalOpen} onClose={() => { setAnnouncModalOpen(false); form.reset(); }} title="Đăng thông báo nội bộ" size="md">
        <form onSubmit={form.handleSubmit(onSubmitAnnouncement)} className="space-y-3">
          <FormField label="Tiêu đề" required error={form.formState.errors.title?.message}>
            <input {...form.register("title")} className="input" />
          </FormField>
          <FormField label="Nội dung" required error={form.formState.errors.content?.message}>
            <textarea {...form.register("content")} rows={5} className="input resize-none" />
          </FormField>
          <FormField label="Hết hạn (tuỳ chọn)">
            <input type="datetime-local" {...form.register("expires_at")} className="input" />
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...form.register("is_pinned")} className="rounded border-border" />
            <span className="text-sm text-foreground">Ghim thông báo</span>
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setAnnouncModalOpen(false)}>Huỷ</Button>
            <Button type="submit" loading={createAnnouncement.isPending}>Đăng</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirms */}
      <ConfirmDialog open={!!deleteAnnouncTarget} onOpenChange={(open) => !open && setDeleteAnnouncTarget(null)} title="Xoá thông báo nội bộ?" description="Hành động này không thể hoàn tác." variant="danger" confirmText="Xoá" onConfirm={confirmDeleteAnnouncement} loading={deleteAnnouncement.isPending} />
      <ConfirmDialog open={!!deleteNotifTarget} onOpenChange={(open) => !open && setDeleteNotifTarget(null)} title="Xoá thông báo?" description="Hành động này không thể hoàn tác." variant="danger" confirmText="Xoá" onConfirm={handleDeleteNotif} loading={deleteNotification.isPending} />
    </div>
  );
}
