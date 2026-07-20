import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOrderStatusLabel, getLevelLabel } from "@/lib/utils";

// ─── 管理员鉴权 helper ─────────────────────────────────────────────────────

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return user;
}

// ─── GET /api/admin/orders ──────────────────────────────────────────────────
// 所有订单列表，支持按 status / membershipLevel 筛选

export async function GET(request: NextRequest) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const level = searchParams.get("level");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20));

    const where: Record<string, unknown> = {};
    if (status && Object.keys({ PENDING: 1, PAID: 1, SHIPPED: 1, DELIVERED: 1, CANCELLED: 1 }).includes(status)) {
      where.status = status;
    }
    if (level && ["REGULAR", "XINYUE1", "XINYUE2"].includes(level)) {
      where.membershipLevel = level;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            select: { id: true, name: true, price: true, quantity: true, productId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/admin/orders failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
