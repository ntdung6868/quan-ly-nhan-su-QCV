"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Leave, LeaveType, LeaveAllocation } from "@/types/database";

export type LeaveWithRels = Leave & {
  leave_type?: { name: string; is_paid: boolean };
  employee?: { full_name: string };
  approver?: { full_name: string };
};

interface UseLeavesOptions {
  status?: string;
  employeeId?: string;
  isManager?: boolean;
}

export function useLeaves(options: UseLeavesOptions = {}) {
  const supabase = createClient();
  const { status, employeeId, isManager } = options;

  return useQuery({
    queryKey: ["leaves", { status, employeeId, isManager }],
    queryFn: async () => {
      let query = supabase
        .from("leaves")
        .select("*, leave_type:leave_types(name,is_paid)")
        .order("created_at", { ascending: false });

      if (!isManager && employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      type EmpRow = { id: string; full_name: string };
      const leaves = (rows || []) as Leave[];
      // Load employee names separately (leaves has 2 FKs to employees)
      const empIds = [...new Set(leaves.map((l: Leave) => l.employee_id).filter(Boolean))] as string[];
      const empRes = empIds.length
        ? await supabase.from("employees").select("id,full_name").in("id", empIds)
        : { data: [] as EmpRow[] };
      const empMap = new Map((empRes.data || []).map((e: EmpRow) => [e.id, e]));

      return leaves.map((l: Leave) => ({
        ...l,
        employee: empMap.get(l.employee_id) ?? undefined,
      })) as LeaveWithRels[];
    },
    enabled: isManager || !!employeeId,
  });
}

export function useLeaveTypes() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["leaveTypes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as LeaveType[];
    },
  });
}

export function useLeaveAllocations(employeeId?: string, year?: number) {
  const supabase = createClient();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["leaveAllocations", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_allocations")
        .select("*, leave_type:leave_types(name)")
        .eq("employee_id", employeeId!)
        .eq("year", currentYear);
      if (error) throw error;
      return data as (LeaveAllocation & { leave_type?: { name: string } })[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateLeave() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      values: Partial<Leave> & { employee_id: string }
    ) => {
      const { data, error } = await supabase
        .from("leaves")
        .insert({ ...values, status: "pending" } as Leave)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaveAllocations"] });
    },
  });
}

export function useApproveLeave() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      approverId,
    }: {
      id: string;
      approverId: string;
    }) => {
      const { data, error } = await supabase
        .from("leaves")
        .update({
          status: "approved",
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaveAllocations"] });
    },
  });
}

export function useRejectLeave() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
      approverId,
    }: {
      id: string;
      reason: string;
      approverId: string;
    }) => {
      const { data, error } = await supabase
        .from("leaves")
        .update({
          status: "rejected",
          approved_by: approverId,
          rejection_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelLeave() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("leaves")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaveAllocations"] });
    },
  });
}
