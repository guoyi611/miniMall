import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDiscountRate } from "@/lib/membership";

// ─── GET /api/cart ─────────────────────────────────────────────────────────
// 获取当前用户购物车列表（需登录），含会员折扣信息

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const [items, fullUser] = await Promise.all([
      prisma.cartItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              stock: true,
              isPublished: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { membershipLevel: true, totalSpent: true },
      }),
    ]);

    const membershipLevel = fullUser?.membershipLevel ?? "REGULAR";
    const discountRate = getDiscountRate(membershipLevel as Parameters<typeof getDiscountRate>[0]);

    return NextResponse.json({
      data: {
        items,
        membershipLevel,
        discountRate,
      },
    });
  } catch (error) {
    console.error("GET /api/cart failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}

// ─── POST /api/cart ────────────────────────────────────────────────────────
// 加入购物车 — productId + quantity
// 已有则累加数量，库存不足返回错误

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { productId, quantity = 1 } = await request.json();

    // ─── 输入校验 ──────────────────────────────────────────────────────────
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "商品信息有误" },
        { status: 400 }
      );
    }

    const qty = parseInt(String(quantity), 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json(
        { error: "数量必须大于 0" },
        { status: 400 }
      );
    }

    // ─── 事务：原子检查商品/库存并 upsert ─────────────────────────────────
    const item = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, stock: true, isPublished: true },
      });

      if (!product || !product.isPublished) {
        return { _error: "商品不存在或已下架", _status: 404 as const };
      }

      const existing = await tx.cartItem.findUnique({
        where: { userId_productId: { userId: user.id, productId } },
        select: { quantity: true },
      });

      const newQty = (existing?.quantity ?? 0) + qty;
      if (newQty > product.stock) {
        return { _error: `库存不足（剩余 ${product.stock} 件）`, _status: 400 as const };
      }

      return tx.cartItem.upsert({
        where: { userId_productId: { userId: user.id, productId } },
        create: { userId: user.id, productId, quantity: qty },
        update: { quantity: newQty },
      });
    });

    if ("_error" in item) {
      return NextResponse.json(
        { error: item._error },
        { status: item._status }
      );
    }

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "请求格式错误" },
        { status: 400 }
      );
    }
    console.error("POST /api/cart failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
