import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/categories ─────────────────────────────────────────────────────
// 分类列表，含商品数量

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/categories failed:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
