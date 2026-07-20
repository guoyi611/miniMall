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

// ─── GET /api/admin/categories ──────────────────────────────────────────────
// 全量分类列表

export async function GET() {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/admin/categories failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ─── POST /api/admin/categories ─────────────────────────────────────────────
// 新增分类

export async function POST(request: NextRequest) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { name, description } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "分类名不能为空" }, { status: 400 });
    }

    // 自动生成 slug
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^\w一-鿿-]/g, "")
      .slice(0, 60);

    // slug 唯一性检查
    const existing = await prisma.category.findUnique({ where: { slug } });
    const finalSlug = existing
      ? `${slug}-${Math.random().toString(36).slice(2, 6)}`
      : slug;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    console.error("POST /api/admin/categories failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
