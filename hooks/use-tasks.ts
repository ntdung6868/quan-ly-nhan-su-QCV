"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/types/database";

export type TaskWithRels = Task & {
  assignee?: { full_name: string };
  assigner?: { full_name: string };
  department?: { name: string };
};

interface UseTasksOptions {
  status?: string;
  employeeId?: string;
  isManager?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const supabase = createClient();
  const { status, employeeId, isManager } = options;

  return useQuery({
    queryKey: ["tasks", { status, employeeId, isManager }],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(
          "*, assignee:employees!assigned_to(full_name), assigner:employees!assigned_by(full_name), department:departments(name)"
        )
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (!isManager && employeeId) {
        query = query.or(
          `assigned_to.eq.${employeeId},assigned_by.eq.${employeeId}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TaskWithRels[];
    },
    enabled: isManager || !!employeeId,
  });
}

export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Task>) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(values as Task)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const update: Partial<Task> = { status };
      if (status === "done") {
        update.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
