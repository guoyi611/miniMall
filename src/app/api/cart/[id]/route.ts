import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ─── 辅助：查找并校验归属 ──────────────────────────────────────────────────

async function getOwnedCartItem(cartItemId: string, userId: string) {
  return prisma.cartItem.findFirst({
    where: { id: cartItemId, userId },
    include: {
      product: { select: { id: true, stock: true } },
    },
  });
}

// ─── PUT /api/cart/[id] ────────────────────────────────────────────────────
// 修改购物车项数量

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
    const { quantity } = await request.json();

    const qty = parseInt(String(quantity), 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json(
        { error: "数量必须大于 0" },
        { status: 400 }
      );
    }

    // ─── 校验归属 ──────────────────────────────────────────────────────────
    const item = await getOwnedCartItem(id, user.id);
    if (!item) {
      return NextResponse.json(
        { error: "购物车项不存在" },
        { status: 404 }
      );
    }

    // ─── 校验库存 ──────────────────────────────────────────────────────────
    if (qty > item.product.stock) {
      return NextResponse.json(
        { error: `库存不足（剩余 ${item.product.stock} 件）` },
        { status: 400 }
      );
    }

    // ─── 更新 ──────────────────────────────────────────────────────────────
    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: qty },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "请求格式错误" },
        { status: 400 }
      );
    }
    console.error("PUT /api/cart/[id] failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/cart/[id] ─────────────────────────────────────────────────
// 删除购物车项

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    // ─── 校验归属 ──────────────────────────────────────────────────────────
    const item = await getOwnedCartItem(id, user.id);
    if (!item) {
      return NextResponse.json(
        { error: "购物车项不存在" },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/cart/[id] failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
