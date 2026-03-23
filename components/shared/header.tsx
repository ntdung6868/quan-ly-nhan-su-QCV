"use client";

import { useEffect, useState } from "react";
import { Menu, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { profile, employee } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data || []));

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function markAllRead() {
    if (!profile?.id) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
        {title && <h1 className="font-semibold text-gray-800 text-base">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-800 text-sm">Thông báo</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                      Không có thông báo
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition",
                          !notif.is_read && "bg-blue-50/50"
                        )}
                      >
                        <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
          {(employee?.full_name || profile?.full_name || "U")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      </div>
    </header>
  );
}
