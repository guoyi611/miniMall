import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";

// ─── POST /api/auth/login ───────────────────────────────────────────────────
// 登录 — 验证密码，写入 httpOnly session cookie

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // ─── 输入校验 ──────────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "请输入邮箱和密码" },
        { status: 400 }
      );
    }

    // ─── 查找用户 ──────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // 无论用户不存在还是密码错误，返回相同错误（防止撞库攻击）
    if (!user) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    // ─── 写入 session ──────────────────────────────────────────────────────
    const cookie = setSession(user.id, user.role);

    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipLevel: user.membershipLevel,
        totalSpent: user.totalSpent,
        createdAt: user.createdAt,
      },
    });

    response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "请求格式错误" },
        { status: 400 }
      );
    }
    console.error("POST /api/auth/login failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
