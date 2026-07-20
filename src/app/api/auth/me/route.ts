import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
// 获取当前登录用户信息（含会员等级）

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("GET /api/auth/me failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
