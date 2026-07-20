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

// ─── DELETE /api/admin/categories/[id] ──────────────────────────────────────
// 删除分类（含其下所有商品）

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
