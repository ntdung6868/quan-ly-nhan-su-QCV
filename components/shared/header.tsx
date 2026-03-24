"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Menu, Bell, Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@/types/database";
import { formatDateTime, cn, getInitials } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { profile, employee } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Load notifications + realtime
  useEffect(() => {
    if (!profile?.id) return;

    // Initial load
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: { data: Notification[] | null }) => setNotifications(data || []));

    // Realtime: INSERT, UPDATE, DELETE
    const channel = supabase
      .channel(`notifs-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, supabase]);

  // Click outside to close
  useEffect(() => {
    if (!showNotifs) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    // Delay để không bắt click mở dropdown
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [showNotifs]);

  async function markAllRead() {
    if (!profile?.id) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const displayName = employee?.full_name || profile?.full_name || "U";

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition"
        >
          <Menu size={20} />
        </button>
        {title && <h1 className="font-semibold text-foreground text-base">{title}</h1>}
      </div>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition"
        >
          <Sun size={18} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={18} className="absolute top-2 left-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs((prev) => !prev)}
            className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-xl ring-1 ring-border z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="font-semibold text-sm">Thông báo</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Không có thông báo
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition",
                        !notif.is_read && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}
                        <div className={cn(!notif.is_read ? "" : "ml-4")}>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{formatDateTime(notif.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
          {getInitials(displayName)}
        </div>
      </div>
    </header>
  );
}
