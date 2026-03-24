"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CompanyConfig, SalaryConfig } from "@/types/database";

export function useCompanyConfig() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["companyConfig"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_config")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as CompanyConfig | null;
    },
  });
}

export function useSalaryConfigSettings() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["salaryConfigSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_config")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as SalaryConfig | null;
    },
  });
}

export function useSaveCompanyConfig() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<CompanyConfig> & { id?: string }) => {
      if (id) {
        const { data, error } = await supabase
          .from("company_config")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("company_config")
          .insert(values as CompanyConfig)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyConfig"] });
    },
  });
}

export function useSaveSalaryConfig() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<SalaryConfig> & { id?: string }) => {
      if (id) {
        const { data, error } = await supabase
          .from("salary_config")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("salary_config")
          .insert(values as SalaryConfig)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaryConfigSettings"] });
      queryClient.invalidateQueries({ queryKey: ["salaryConfig"] });
    },
  });
}
