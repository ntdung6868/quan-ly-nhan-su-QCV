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
      onSuccess: () => {},
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
      {/* Toolbar */}
      <div className="bg-card rounded-xl ring-1 ring-border p-3 flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${unreadCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
          {unreadCount} chưa đọc
        </span>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`text-xs ${unreadCount > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"}`}
        >
          Đánh dấu đã đọc
        </button>
        <div className="flex-1" />
        {isAdmin && (
          <Button onClick={() => { form.reset(); setAnnouncModalOpen(true); }} leftIcon={<Plus size={14} />} size="sm">
            Đăng thông báo nội bộ
          </Button>
        )}
      </div>

      {/* List */}
      <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Đang tải...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 hover:bg-accent/50 transition cursor-pointer group",
                    !notif.is_read && "bg-primary/5"
                  )}
                >
                  {/* Dot */}
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    !notif.is_read ? "bg-primary" : "bg-transparent"
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm text-foreground",
                      !notif.is_read ? "font-semibold" : "font-medium"
                    )}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{formatDateTime(notif.created_at)}</p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteNotifTarget(notif.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition shrink-0 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Create announcement modal */}
      <Modal
        open={announcModalOpen}
        onClose={() => { setAnnouncModalOpen(false); form.reset(); }}
        title="Đăng thông báo nội bộ"
        size="md"
      >
        <form onSubmit={form.handleSubmit(onSubmitAnnouncement)} className="space-y-3">
          <FormField
            label="Tiêu đề"
            required
            error={form.formState.errors.title?.message}
          >
            <input
              {...form.register("title")}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          <FormField
            label="Nội dung"
            required
            error={form.formState.errors.content?.message}
          >
            <textarea
              {...form.register("content")}
              rows={5}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>

          <FormField label="Hết hạn (tuỳ chọn)">
            <input
              type="datetime-local"
              {...form.register("expires_at")}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...form.register("is_pinned")}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">Ghim thông báo</span>
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAnnouncModalOpen(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" loading={createAnnouncement.isPending}>
              Đăng
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteNotifTarget} onOpenChange={(open) => !open && setDeleteNotifTarget(null)} title="Xoá thông báo?" description="Hành động này không thể hoàn tác." variant="danger" confirmText="Xoá" onConfirm={handleDeleteNotif} loading={deleteNotification.isPending} />
    </div>
  );
}
