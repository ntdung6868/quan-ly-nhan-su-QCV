"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const router = useRouter();
  const { user, profile, employee, isLoading, setUser, setProfile, setEmployee, setLoading, reset } =
    useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
      } else {
        reset();
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      const { data: employeeData } = await supabase
        .from("employees")
        .select("*, department:departments(*), shift:shifts(*)")
        .eq("user_id", userId)
        .single();
      setEmployee(employeeData);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  return {
    user,
    profile,
    employee,
    isLoading,
    isAdmin: profile?.role === "admin",
    isManager: profile?.role === "manager" || profile?.role === "admin",
    signOut,
  };
}
