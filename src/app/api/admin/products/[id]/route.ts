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

async function getProductById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
}

// ─── GET /api/admin/products/[id] ───────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("GET /api/admin/products/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ─── PUT /api/admin/products/[id] ───────────────────────────────────────────
// 编辑商品

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    const { name, price, stock, categoryId, description, images, isPublished } =
      await request.json();

    // 输入校验
    const errors: string[] = [];
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      errors.push("商品名不能为空");
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      errors.push("价格不合法");
    }
    if (stock !== undefined && (typeof stock !== "number" || stock < 0 || !Number.isInteger(stock))) {
      errors.push("库存必须是非负整数");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("；") }, { status: 400 });
    }

    // 分类校验
    if (categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "分类不存在" }, { status: 400 });
      }
    }

    // 图片处理
    let imageJson: string | undefined;
    if (images !== undefined) {
      const imageList = Array.isArray(images)
        ? images.filter((u: unknown) => typeof u === "string" && u.length > 0)
        : [];
      imageJson = JSON.stringify(imageList);
    }

    // 名称变更 → 重新生成 slug
    let slug: string | undefined;
    if (name !== undefined && name.trim() !== product.name) {
      slug = name
        .trim()
        .toLowerCase()
        .replace(/[\s]+/g, "-")
        .replace(/[^\w一-鿿-]/g, "")
        .slice(0, 60);
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(categoryId !== undefined && { categoryId }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(imageJson !== undefined && { images: imageJson }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    console.error("PUT /api/admin/products/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/products/[id] ────────────────────────────────────────
// 删除商品

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reject = await ensureAdmin();
    if (reject instanceof NextResponse) return reject;

    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] failed:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
