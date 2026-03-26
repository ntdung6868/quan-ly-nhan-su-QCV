"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCached, setCache } from "@/lib/cache";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Profile, Employee } from "@/types/database";

// ============================================================
// Global store — shared across all useAuth() instances
// ============================================================
type AuthState = {
  user: User | null;
  profile: Profile | null;
  employee: Employee | null;
  loading: boolean;
};

let state: AuthState = {
  user: null,
  profile: getCached<Profile>("profile") ?? null,
  employee: getCached<Employee>("employee") ?? null,
  loading: true,
};

const listeners = new Set<() => void>();

function getSnapshot() {
  return state;
}

function notify() {
  listeners.forEach((l) => l());
}

function setState(partial: Partial<AuthState>) {
  state = { ...state, ...partial };
  notify();
}

// Track if subscription already initialized
let initialized = false;

export function useAuth() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Subscribe all instances to global state
  const current = useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    getSnapshot,
    getSnapshot
  );

  // Initialize auth subscription once
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    async function fetchUserData(userId: string) {
      try {
        const [{ data: profileRows, error: profileErr }, { data: empRows, error: empErr }] =
          await Promise.all([
            supabase.from("profiles").select("*").eq("id", userId).limit(1),
            supabase.from("employees").select("*").eq("user_id", userId).limit(1),
          ]);

        if (profileErr) console.error("[useAuth] profile error:", profileErr.message);
        if (empErr) console.error("[useAuth] employee error:", empErr.message);

        const profileData = (profileRows?.[0] as Profile) ?? null;
        const employeeData = (empRows?.[0] as Employee) ?? null;

        // NV nghỉ việc (inactive) → không cho truy cập (trừ admin)
        if (employeeData?.status === "inactive" && profileData?.role !== "admin") {
          await supabase.auth.signOut();
          setState({ user: null, profile: null, employee: null, loading: false });
          window.location.href = "/login?error=inactive";
          return;
        }

        setState({ profile: profileData, employee: employeeData, loading: false });
        if (profileData) setCache("profile", profileData);
        if (employeeData) setCache("employee", employeeData);
      } catch (err) {
        console.error("[useAuth] fetchUserData error:", err);
        setState({ loading: false });
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setState({ user: currentUser });

        if (currentUser) {
          fetchUserData(currentUser.id);
        } else {
          setState({ profile: null, employee: null, loading: false });
        }
      }
    );

    return () => {
      initialized = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[useAuth] signOut error:", err);
    }
    setState({ user: null, profile: null, employee: null });
    window.location.href = "/login";
  }

  function updateEmployee(partial: Partial<Employee>) {
    if (!state.employee) return;
    const updated = { ...state.employee, ...partial };
    setCache("employee", updated);
    setState({ employee: updated });
  }

  return {
    user: current.user,
    profile: current.profile,
    employee: current.employee,
    loading: current.loading,
    isAdmin: current.profile?.role === "admin",
    isManager: current.profile?.role === "manager" || current.profile?.role === "admin",
    signOut,
    updateEmployee,
  };
}
