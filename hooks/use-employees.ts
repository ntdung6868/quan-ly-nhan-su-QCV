"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Employee, Department } from "@/types/database";

export type EmployeeWithRels = Employee & {
  department?: Department;
  manager?: Employee;
};

interface UseEmployeesOptions {
  search?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const supabase = createClient();
  const { search, departmentId, status, page = 1, pageSize = 50 } = options;

  return useQuery({
    queryKey: ["employees", { search, departmentId, status, page, pageSize }],
    queryFn: async () => {
      // Query employees without ambiguous joins
      let query = supabase
        .from("employees")
        .select("*", { count: "exact" })
        .order("full_name");

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`
        );
      }
      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rows, error, count } = await query;
      if (error) throw error;

      const emps = rows || [];
      // Load departments in bulk
      const deptIds = [...new Set(emps.map((e: Employee) => e.department_id).filter(Boolean))] as string[];
      const mgrIds = [...new Set(emps.map((e: Employee) => e.manager_id).filter(Boolean))] as string[];

      const [deptRes, mgrRes] = await Promise.all([
        deptIds.length
          ? supabase.from("departments").select("id,name").in("id", deptIds)
          : { data: [] as { id: string; name: string }[] },
        mgrIds.length
          ? supabase.from("employees").select("id,full_name").in("id", mgrIds)
          : { data: [] as { id: string; full_name: string }[] },
      ]);

      const deptMap = new Map((deptRes.data || []).map((d: { id: string; name: string }) => [d.id, d]));
      const mgrMap = new Map((mgrRes.data || []).map((m: { id: string; full_name: string }) => [m.id, m]));

      return {
        employees: emps.map((e: Employee) => ({
          ...e,
          department: e.department_id ? deptMap.get(e.department_id) : undefined,
          manager: e.manager_id ? mgrMap.get(e.manager_id) : undefined,
        })) as EmployeeWithRels[],
        total: count || 0,
      };
    },
  });
}

export function useEmployee(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const { data: emp, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!emp) throw new Error("Không tìm thấy nhân viên");

      // Load relations separately to avoid ambiguous FK
      const [deptRes, mgrRes] = await Promise.all([
        emp.department_id
          ? supabase.from("departments").select("*").eq("id", emp.department_id).maybeSingle()
          : { data: null },
        emp.manager_id
          ? supabase.from("employees").select("id,full_name").eq("id", emp.manager_id).maybeSingle()
          : { data: null },
      ]);

      return {
        ...emp,
        department: deptRes.data ?? undefined,
        manager: mgrRes.data ?? undefined,
      } as EmployeeWithRels;
    },
    enabled: !!id,
  });
}

// Chuyển "" → null cho các field optional (tránh lỗi DB kiểu date/number)
function cleanValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = val === "" ? null : val;
  }
  return result;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Employee> & { full_name: string }) => {
      const { generateCredentials } = await import("@/lib/utils");
      const { email, password } = generateCredentials(values.full_name);

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: values.full_name,
          employee_data: cleanValues(values as Record<string, unknown>),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tạo nhân viên thất bại");

      return { ...json.employee, _credentials: json.credentials };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateEmployee() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(cleanValues(values as Record<string, unknown>))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteEmployee() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
