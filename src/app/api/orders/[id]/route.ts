import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUpgradedLevel } from "@/lib/membership";

// ─── 辅助：查询订单并校验归属 ──────────────────────────────────────────────

async function getOwnedOrder(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          productId: true,
        },
      },
    },
  });
}

// ─── GET /api/orders/[id] ──────────────────────────────────────────────────
// 订单详情

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const order = await getOwnedOrder(id, user.id);

    if (!order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("GET /api/orders/[id] failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/orders/[id] ──────────────────────────────────────────────────
// 订单操作：支付（PENDING → PAID）或取消（任意 → CANCELLED）

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();

    const order = await getOwnedOrder(id, user.id);
    if (!order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      );
    }

    // ─── 取消订单 ──────────────────────────────────────────────────────────
    if (action === "cancel") {
      if (order.status === "CANCELLED") {
        return NextResponse.json(
          { error: "订单已取消" },
          { status: 400 }
        );
      }
      // 恢复库存
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      });

      const updated = await getOwnedOrder(id, user.id);
      return NextResponse.json({ data: updated });
    }

    // ─── 模拟支付 ──────────────────────────────────────────────────────────
    if (action === "pay") {
      if (order.status !== "PENDING") {
        return NextResponse.json(
          { error: "当前订单状态无法支付" },
          { status: 400 }
        );
      }

      // 更新订单状态 + 累加消费额 + 检查升级
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: "PAID" },
        });

        // 累加累计消费额
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { totalSpent: { increment: order.total } },
          select: { totalSpent: true, membershipLevel: true },
        });

        // 检查会员升级
        const newLevel = getUpgradedLevel(
          updatedUser.membershipLevel as Parameters<typeof getUpgradedLevel>[0],
          updatedUser.totalSpent
        );
        if (newLevel !== updatedUser.membershipLevel) {
          await tx.user.update({
            where: { id: user.id },
            data: { membershipLevel: newLevel },
          });
        }
      });

      const updated = await getOwnedOrder(id, user.id);
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json(
      { error: `不支持的操作：${action}` },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "请求格式错误" },
        { status: 400 }
      );
    }
    console.error("PUT /api/orders/[id] failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
