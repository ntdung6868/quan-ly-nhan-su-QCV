import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const { user_id, new_password } = await request.json();

    if (!user_id || !new_password) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { error } = await admin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      return NextResponse.json(
        { error: `Đặt lại mật khẩu thất bại: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Lỗi server" },
      { status: 500 }
    );
  }
}
