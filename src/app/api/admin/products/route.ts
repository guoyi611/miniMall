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

// ─── GET /api/admin/products ────────────────────────────────────────────────
// 商品列表，支持搜索、分类筛选、分页

export async function GET(request: NextRequest) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId");
    const published = searchParams.get("published"); // "true" | "false" | undefined
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20));

    const where: Record<string, unknown> = {};
    if (q) {
      where.name = { contains: q };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (published === "true") {
      where.isPublished = true;
    } else if (published === "false") {
      where.isPublished = false;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/admin/products failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ─── POST /api/admin/products ───────────────────────────────────────────────
// 新增商品

export async function POST(request: NextRequest) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { name, price, stock, categoryId, description, images, isPublished } =
      await request.json();

    // 输入校验
    const errors: string[] = [];
    if (!name || typeof name !== "string" || !name.trim()) {
      errors.push("商品名不能为空");
    }
    if (price == null || typeof price !== "number" || price < 0) {
      errors.push("价格不合法");
    }
    if (stock != null && (typeof stock !== "number" || stock < 0 || !Number.isInteger(stock))) {
      errors.push("库存必须是非负整数");
    }
    if (!categoryId || typeof categoryId !== "string") {
      errors.push("请选择分类");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("；") }, { status: 400 });
    }

    // 检查分类存在
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 });
    }

    // 生成 slug
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^\w一-鿿-]/g, "")
      .slice(0, 60);

    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existingSlug
      ? `${slug}-${Math.random().toString(36).slice(2, 6)}`
      : slug;

    const imageList = Array.isArray(images)
      ? images.filter((u: unknown) => typeof u === "string" && u.length > 0)
      : [];

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        price,
        stock: stock ?? 0,
        categoryId,
        description: description?.trim() || null,
        images: JSON.stringify(imageList),
        isPublished: isPublished !== false,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    console.error("POST /api/admin/products failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
