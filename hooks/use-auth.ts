"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCached, setCache } from "@/lib/cache";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Profile, Employee } from "@/types/database";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => getCached<Profile>("profile"));
  const [employee, setEmployee] = useState<Employee | null>(() => getCached<Employee>("employee"));
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let ignore = false;

    async function fetchUserData(userId: string) {
      try {
        const [{ data: profileRows, error: profileErr }, { data: empRows, error: empErr }] =
          await Promise.all([
            supabase.from("profiles").select("*").eq("id", userId).limit(1),
            supabase.from("employees").select("*").eq("user_id", userId).limit(1),
          ]);

        if (profileErr) console.error("[useAuth] profile query error:", profileErr.message, profileErr);
        if (empErr) console.error("[useAuth] employee query error:", empErr.message, empErr);

        const profileData = profileRows?.[0] ?? null;
        const employeeData = empRows?.[0] ?? null;

        // Nếu chưa có profile (trigger chưa chạy hoặc bị xoá), log warning
        if (!profileData) console.warn("[useAuth] profile NOT FOUND for userId:", userId);
        if (!employeeData) console.warn("[useAuth] employee NOT FOUND for userId:", userId);

        if (!ignore) {
          setProfile(profileData as Profile ?? null);
          setEmployee(employeeData ?? null);
          if (profileData) setCache("profile", profileData);
          if (employeeData) setCache("employee", employeeData);
        }
      } catch (err) {
        console.error("[useAuth] fetchUserData error:", err);
      } finally {
        // loading chỉ tắt SAU KHI profile/employee đã load xong
        if (!ignore) setLoading(false);
      }
    }

    // Dùng onAuthStateChange là single source of truth.
    // KHÔNG gọi getSession() hoặc getUser() — chúng deadlock
    // với navigator.locks khi gọi đồng thời.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // loading sẽ tắt trong fetchUserData.finally
          if (!ignore) fetchUserData(currentUser.id);
        } else {
          setProfile(null);
          setEmployee(null);
          if (!ignore) setLoading(false);
        }
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[useAuth] signOut error:", err);
    }
    setUser(null);
    setProfile(null);
    setEmployee(null);
    // Hard redirect để clear toàn bộ client state
    window.location.href = "/login";
  }

  function updateEmployee(partial: Partial<Employee>) {
    setEmployee((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      setCache("employee", updated);
      return updated;
    });
  }

  return {
    user,
    profile,
    employee,
    loading,
    isAdmin: profile?.role === "admin",
    isManager: profile?.role === "manager" || profile?.role === "admin",
    signOut,
    updateEmployee,
  };
}
