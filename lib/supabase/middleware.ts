import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login"];
const adminPaths = ["/employees", "/departments", "/holidays", "/reports", "/settings"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Chưa đăng nhập → redirect về login (trừ trang public)
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Đã đăng nhập → check employee status + quyền
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // NV nghỉ việc (inactive) → sign out + redirect login
    if (profile?.role !== "admin") {
      const { data: emp } = await supabase
        .from("employees")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (emp?.status === "inactive") {
        // Xoá session
        await supabase.auth.signOut();
        const url = new URL("/login?error=inactive", request.url);
        return NextResponse.redirect(url);
      }
    }

    // Đã đăng nhập → redirect khỏi trang login
    if (isPublic) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Kiểm tra quyền admin
    if (adminPaths.some((p) => pathname.startsWith(p))) {
      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}
