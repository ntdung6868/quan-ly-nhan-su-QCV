import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Dùng service role key — bypass rate limit + RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, employee_data } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Tạo auth user (admin API, không bị rate limit)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "employee" },
    });

    if (authError) {
      return NextResponse.json(
        { error: `Tạo tài khoản thất bại: ${authError.message}` },
        { status: 400 }
      );
    }

    // 2. Tạo employee record
    // Lấy số thứ tự tiếp theo
    const { data: lastEmp } = await admin
      .from("employees")
      .select("employee_code")
      .like("employee_code", "QCV%")
      .order("employee_code", { ascending: false })
      .limit(1);
    const lastNum = lastEmp?.[0]?.employee_code
      ? parseInt(lastEmp[0].employee_code.replace("QCV", ""), 10)
      : 0;
    const code = `QCV${String(lastNum + 1).padStart(3, "0")}`;
    const { data: emp, error: empError } = await admin
      .from("employees")
      .insert({
        ...employee_data,
        email,
        employee_code: code,
        user_id: authData.user.id,
      })
      .select()
      .single();

    if (empError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Tạo nhân viên thất bại: ${empError.message}` },
        { status: 400 }
      );
    }

    // 3. Tạo leave allocations cho NV mới (nghỉ phép năm 12 ngày)
    const currentYear = new Date().getFullYear();
    const { data: annualType } = await admin
      .from("leave_types")
      .select("id, days_per_year")
      .eq("is_paid", true)
      .limit(10);

    if (annualType && annualType.length > 0) {
      await admin.from("leave_allocations").insert(
        annualType.map((lt: { id: string; days_per_year: number }) => ({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year: currentYear,
          total_days: lt.days_per_year,
          used_days: 0,
        }))
      );
    }

    return NextResponse.json({ employee: emp, credentials: { email, password } });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Lỗi server" },
      { status: 500 }
    );
  }
}
