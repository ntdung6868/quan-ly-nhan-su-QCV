"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useNotifications,
  useMarkAllRead,
  useDeleteNotification,
  useCreateAnnouncement,
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
import { Bell, Check, Plus, Trash2 } from "lucide-react";
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
  const [deleteNotifTarget, setDeleteNotifTarget] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useNotifications(profile?.id);
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();
  const createAnnouncement = useCreateAnnouncement();

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
        onSuccess: () => { toast.success("Đã đăng thông báo"); setAnnouncModalOpen(false); form.reset(); },
        onError: () => toast.error("Lỗi tạo thông báo"),
      }
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="ghost" size="sm" leftIcon={<Check size={14} />} loading={markAllRead.isPending}>
              Đánh dấu đã đọc ({unreadCount})
            </Button>
          )}
        </div>
        {isAdmin && (
          <Button onClick={() => { form.reset(); setAnnouncModalOpen(true); }} leftIcon={<Plus size={14} />} size="sm">
            Đăng thông báo nội bộ
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
        {isLoading ? (
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
                  !notif.is_read ? "bg-primary" : "bg-muted-foreground/30"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm text-foreground", !notif.is_read && "font-semibold")}>{notif.title}</p>
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
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setAnnouncModalOpen(false)}>Huỷ</Button>
            <Button type="submit" loading={createAnnouncement.isPending}>Đăng</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteNotifTarget} onOpenChange={(open) => !open && setDeleteNotifTarget(null)} title="Xoá thông báo?" description="Hành động này không thể hoàn tác." variant="danger" confirmText="Xoá" onConfirm={handleDeleteNotif} loading={deleteNotification.isPending} />
    </div>
  );
}
