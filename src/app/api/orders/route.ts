import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDiscountRate, getUpgradedLevel } from "@/lib/membership";

// ─── GET /api/orders ───────────────────────────────────────────────────────
// 当前用户订单列表

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}

// ─── POST /api/orders ──────────────────────────────────────────────────────
// 从购物车创建订单
// 事务：创建订单 + 扣减库存 + 清空购物车

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // ─── 获取完整用户信息（含会员等级） ────────────────────────────────────
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { membershipLevel: true },
    });
    const membershipLevel = fullUser?.membershipLevel ?? "REGULAR";

    // ─── 获取购物车商品 ────────────────────────────────────────────────────
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: { id: true, name: true, price: true, stock: true, isPublished: true },
        },
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "购物车为空" },
        { status: 400 }
      );
    }

    // ─── 校验库存 + 已下架 ─────────────────────────────────────────────────
    const outOfStock: string[] = [];
    for (const item of cartItems) {
      if (!item.product.isPublished) {
        outOfStock.push(`「${item.product.name}」已下架`);
      } else if (item.product.stock < item.quantity) {
        outOfStock.push(
          `「${item.product.name}」库存不足（需要 ${item.quantity}，剩余 ${item.product.stock}）`
        );
      }
    }
    if (outOfStock.length > 0) {
      return NextResponse.json(
        { error: outOfStock.join("；") },
        { status: 400 }
      );
    }

    // ─── 计算价格 ──────────────────────────────────────────────────────────
    const originalTotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const discountRate = getDiscountRate(membershipLevel as Parameters<typeof getDiscountRate>[0]);
    const discount = Math.round(originalTotal * discountRate * 100) / 100;
    const total = Math.round((originalTotal - discount) * 100) / 100;

    // ─── 事务：创建订单 + 扣库存 + 清空购物车 ──────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      // 1. 创建订单
      const created = await tx.order.create({
        data: {
          userId: user.id,
          status: "PENDING",
          originalTotal,
          discount,
          total,
          membershipLevel: membershipLevel as "REGULAR" | "XINYUE1" | "XINYUE2",
        },
      });

      // 2. 创建订单项 + 扣减库存
      for (const item of cartItems) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          },
        });
        await tx.product.update({
          where: { id: item.product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. 清空购物车
      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return created;
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
