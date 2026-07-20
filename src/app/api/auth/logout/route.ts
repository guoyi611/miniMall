import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

// ─── POST /api/auth/logout ────────────────────────────────────────────────
// 退出登录 — 清除 httpOnly session cookie

export async function POST() {
  try {
    const cookie = clearSession();
    const response = NextResponse.json({ data: { success: true } });
    response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    console.error("POST /api/auth/logout failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
