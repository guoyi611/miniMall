import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ─── 辅助 ──────────────────────────────────────────────────────────────────

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return user;
}

async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        select: { id: true, name: true, price: true, quantity: true, productId: true },
      },
    },
  });
}

// ─── GET /api/admin/orders/[id] ─────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ─── PUT /api/admin/orders/[id] ─────────────────────────────────────────────
// 更新订单状态

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const { status } = await request.json();

    const allowed = ["PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `状态不合法，可选值：${allowed.join("、")}` },
        { status: 400 }
      );
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // 状态流转校验
    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      return NextResponse.json(
        { error: `订单已${order.status === "CANCELLED" ? "取消" : "签收"}，无法修改状态` },
        { status: 400 }
      );
    }

    // 取消时恢复库存
    if (status === "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      });
    } else {
      await prisma.order.update({ where: { id }, data: { status } });
    }

    const updated = await getOrderById(id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    console.error("PUT /api/admin/orders/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
