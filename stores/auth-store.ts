import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";
import type { Profile, Employee } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  employee: Employee | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setEmployee: (employee: Employee | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      employee: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setEmployee: (employee) => set({ employee }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, profile: null, employee: null }),
    }),
    {
      name: "hr-auth",
      partialize: (state) => ({
        profile: state.profile,
        employee: state.employee,
      }),
    }
  )
);
