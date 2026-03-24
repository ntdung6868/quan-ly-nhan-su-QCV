"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/types/database";

export type ContractWithEmployee = Contract & {
  employee?: { full_name: string; employee_code: string };
};

export function useContracts(employeeId?: string, isAdmin?: boolean) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["contracts", { employeeId, isAdmin }],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select("*, employee:employees(full_name,employee_code)")
        .order("created_at", { ascending: false });

      if (employeeId && !isAdmin) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ContractWithEmployee[];
    },
    enabled: isAdmin || !!employeeId,
  });
}

export function useCreateContract() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Contract>) => {
      const num = `HD${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...values, contract_number: num } as Contract)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useUpdateContract() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<Contract> & { id: string }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
