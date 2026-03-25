"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Department, Employee } from "@/types/database";

export type DepartmentWithRels = Department & {
  manager?: Employee;
  employeeCount: number;
};

export function useDepartments() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const [deptRes, empRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("employees").select("id,full_name,department_id").eq("status", "active").gt("base_salary", 0),
      ]);

      if (deptRes.error) throw deptRes.error;
      if (empRes.error) throw empRes.error;

      type EmpRow = { id: string; full_name: string; department_id: string | null };
      const allEmps = (empRes.data || []) as EmpRow[];
      const empMap = new Map(allEmps.map((e: EmpRow) => [e.id, e]));
      const counts: Record<string, number> = {};
      allEmps.forEach((e: EmpRow) => {
        if (e.department_id) {
          counts[e.department_id] = (counts[e.department_id] || 0) + 1;
        }
      });

      return (deptRes.data || []).map((dept: Department) => {
        let count = counts[dept.id] || 0;
        // Nếu manager không thuộc phòng này, vẫn tính vào
        if (dept.manager_id) {
          const mgr = empMap.get(dept.manager_id);
          if (mgr && mgr.department_id !== dept.id) {
            count += 1;
          }
        }
        return {
          ...dept,
          manager: dept.manager_id ? empMap.get(dept.manager_id) ?? undefined : undefined,
          employeeCount: count,
        };
      }) as DepartmentWithRels[];
    },
  });
}

export function useCreateDepartment() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Department>) => {
      const { data, error } = await supabase
        .from("departments")
        .insert(values as Department)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<Department> & { id: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
