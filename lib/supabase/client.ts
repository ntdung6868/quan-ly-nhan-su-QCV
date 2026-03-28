import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;
let _cachedUserId: string | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    // Khi prerender (build), env vars chưa có → không throw để tránh lỗi build.
    // Queries sẽ không chạy vì hooks có `enabled` guard.
    if (typeof window === "undefined") {
      return createBrowserClient("https://placeholder.supabase.co", "placeholder");
    }
    throw new Error(
      "Supabase chưa được cấu hình. Vui lòng cập nhật NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local"
    );
  }

  client = createBrowserClient(url, key);

  client.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
    _cachedUserId = session?.user?.id ?? null;
  });

  return client;
}

export function getCachedUserId(): string | null {
  return _cachedUserId;
}
