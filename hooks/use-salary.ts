"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Payslip, PayslipStatus, SalaryConfig } from "@/types/database";

export type PayslipWithEmployee = Payslip & {
  employee?: { full_name: string; employee_code: string };
};

export function usePayslips(
  year: number,
  month: number,
  employeeId?: string,
  isAdmin?: boolean
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["payslips", { year, month, employeeId, isAdmin }],
    queryFn: async () => {
      let query = supabase
        .from("payslips")
        .select("*, employee:employees(full_name,employee_code)")
        .eq("year", year)
        .eq("month", month);

      if (!isAdmin && employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PayslipWithEmployee[];
    },
    enabled: isAdmin || !!employeeId,
  });
}

export function useSalaryConfig() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["salaryConfig"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_config")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as SalaryConfig | null;
    },
  });
}

export function useUpdatePayslipStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PayslipStatus;
    }) => {
      const update: Partial<Payslip> = { status };
      if (status === "paid") {
        update.paid_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("payslips")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
    },
  });
}
