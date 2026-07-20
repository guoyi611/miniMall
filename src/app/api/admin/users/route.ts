import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return user;
}

// ─── GET /api/admin/users ────────────────────────────────────────────────
// 用户列表，支持搜索、等级筛选、分页

export async function GET(request: NextRequest) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const level = searchParams.get("level");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20));

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
      ];
    }
    if (level) {
      where.membershipLevel = level;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          membershipLevel: true,
          totalSpent: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/admin/users failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
