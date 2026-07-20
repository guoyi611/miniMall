import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// ─── POST /api/auth/register ────────────────────────────────────────────────
// 注册新用户（默认角色 USER，默认会员等级 REGULAR）

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // ─── 输入校验 ──────────────────────────────────────────────────────────
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    if (
      !password ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return NextResponse.json(
        { error: "密码长度至少为 6 位" },
        { status: 400 }
      );
    }

    // ─── 邮箱唯一性检查 ────────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // ─── 创建用户 ──────────────────────────────────────────────────────────
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: "USER",
        membershipLevel: "REGULAR",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipLevel: true,
        totalSpent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    // JSON 解析失败等
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "请求格式错误" },
        { status: 400 }
      );
    }
    console.error("POST /api/auth/register failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
