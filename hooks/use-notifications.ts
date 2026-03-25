"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Notification, Announcement } from "@/types/database";

export type AnnouncementWithAuthor = Announcement & {
  author?: { full_name: string };
};

export function useNotifications(userId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });
}

export function useAnnouncements(showAll = false) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["announcements", showAll],
    queryFn: async () => {
      let query = supabase
        .from("announcements")
        .select("*, author:employees(full_name)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      // NV chỉ thấy TB chưa hết hạn, admin thấy tất cả
      if (!showAll) {
        query = query.or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AnnouncementWithAuthor[];
    },
  });
}

export function useMarkAllRead() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", userId],
      });
    },
  });
}

export function useDeleteNotification() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateAnnouncement() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      values: Partial<Announcement> & { created_by: string }
    ) => {
      const { data, error } = await supabase
        .from("announcements")
        .insert(values as Announcement)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}
