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
} from "@/hooks/use-notifications";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime, cn } from "@/lib/utils";
import { announcementSchema, type AnnouncementFormValues } from "@/lib/validations/announcement";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Megaphone, Plus, Trash2, Pin, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/database";

const MAX_PINNED = 3;

export default function NotificationsPage() {
  const { profile, employee, isAdmin } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("notifications");
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
        () => { queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] }); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);
  const pinnedCount = useMemo(() => announcements.filter((a) => a.is_pinned).length, [announcements]);

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
    if (!profile?.id || unreadCount === 0) return;
    markAllRead.mutate(profile.id);
  }

  function handleDeleteNotif() {
    if (!deleteNotifTarget) return;
    deleteNotification.mutate(deleteNotifTarget, {
      onSuccess: () => setDeleteNotifTarget(null),
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  async function togglePin(id: string, currentlyPinned: boolean) {
    if (!currentlyPinned && pinnedCount >= MAX_PINNED) {
      toast.error(`Tối đa ${MAX_PINNED} thông báo ghim. Gỡ ghim 1 thông báo khác trước.`);
      return;
    }
    await supabase.from("announcements").update({ is_pinned: !currentlyPinned }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  function onSubmitAnnouncement(values: AnnouncementFormValues) {
    if (!employee?.id) return;
    if (values.is_pinned && pinnedCount >= MAX_PINNED) {
      toast.error(`Tối đa ${MAX_PINNED} thông báo ghim. Gỡ ghim 1 thông báo khác trước.`);
      return;
    }
    createAnnouncement.mutate(
      { ...values, created_by: employee.id, expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : undefined },
      {
        onSuccess: () => { toast.success("Đã đăng thông báo"); setAnnouncModalOpen(false); form.reset(); },
        onError: () => toast.error("Lỗi tạo thông báo"),
      }
    );
  }

  function confirmDeleteAnnouncement() {
    if (!deleteAnnouncTarget) return;
    deleteAnnouncement.mutate(deleteAnnouncTarget, {
      onSuccess: () => { setDeleteAnnouncTarget(null); },
      onError: (err) => toast.error(err.message || "Lỗi"),
    });
  }

  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell size={15} />
            Thông báo cá nhân
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone size={15} />
              Thông báo nội bộ
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Thông báo cá nhân */}
        <TabsContent value="notifications">
          <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
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
            </div>
            {notifLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <EmptyState icon={Bell} title="Chưa có thông báo nào" />
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
                    <div className={cn("w-2 h-2 rounded-full mt-2.5 shrink-0", !notif.is_read ? "bg-primary" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm text-foreground", !notif.is_read ? "font-semibold" : "font-medium")}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{formatDateTime(notif.created_at)}</p>
                    </div>
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
        </TabsContent>

        {/* Tab: Thông báo nội bộ (admin only) */}
        {isAdmin && (
          <TabsContent value="announcements">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Ghim: {pinnedCount}/{MAX_PINNED}
              </p>
              <Button
                onClick={() => { form.reset(); setAnnouncModalOpen(true); }}
                leftIcon={<Plus size={14} />}
                size="sm"
              >
                Đăng thông báo nội bộ
              </Button>
            </div>
            {announcLoading ? (
              <div className="text-center text-muted-foreground py-8 text-sm">Đang tải...</div>
            ) : announcements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Chưa có thông báo nội bộ"
                action={
                  <Button onClick={() => { form.reset(); setAnnouncModalOpen(true); }} leftIcon={<Plus size={14} />} size="sm">
                    Đăng thông báo
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "bg-card rounded-xl ring-1 ring-border p-5 hover:shadow-sm transition-shadow",
                      a.is_pinned && "ring-blue-200 dark:ring-blue-800 bg-blue-50/30 dark:bg-blue-900/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {a.is_pinned && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                              <Pin size={12} /> Ghim
                            </span>
                          )}
                          <h3 className="font-semibold text-foreground">{a.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a.content}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/70">
                          <span>{a.author?.full_name || "Admin"}</span>
                          <span>{formatDateTime(a.created_at)}</span>
                          {a.expires_at && <span>Hết hạn: {formatDateTime(a.expires_at)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePin(a.id, !!a.is_pinned)}
                          className={cn(
                            "p-1.5 rounded transition",
                            a.is_pinned
                              ? "text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              : "text-muted-foreground/50 hover:text-blue-600 hover:bg-accent"
                          )}
                          title={a.is_pinned ? "Gỡ ghim" : pinnedCount >= MAX_PINNED ? `Đã ghim tối đa ${MAX_PINNED}` : "Ghim"}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteAnnouncTarget(a.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded text-destructive/50 hover:text-destructive transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create announcement modal */}
      <Modal
        open={announcModalOpen}
        onClose={() => { setAnnouncModalOpen(false); form.reset(); }}
        title="Đăng thông báo nội bộ"
        size="md"
      >
        <form onSubmit={form.handleSubmit(onSubmitAnnouncement)} className="space-y-3">
          <FormField label="Tiêu đề" required error={form.formState.errors.title?.message}>
            <input
              {...form.register("title")}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
          <FormField label="Nội dung" required error={form.formState.errors.content?.message}>
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
            <input type="checkbox" {...form.register("is_pinned")} className="rounded border-border" />
            <span className="text-sm text-foreground">
              Ghim thông báo
              {pinnedCount >= MAX_PINNED && <span className="text-xs text-muted-foreground ml-1">(đã đạt tối đa {MAX_PINNED})</span>}
            </span>
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
