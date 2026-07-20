import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { MembershipLevel } from "@/lib/membership";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";

// ─── 类型 ───────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

// ─── 首页 ────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: PageProps) {
  const { q = "", category: categorySlug = "", page: pageStr = "1" } =
    await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr, 10) || 1);
  const pageSize = 9;

  // 并行加载分类、商品和当前用户会员信息
  const [categories, productResult, currentUser] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    }),
    loadProducts({ q, categorySlug, currentPage, pageSize }),
    getAuthUserId().then(async (userId) => {
      if (!userId) return { membershipLevel: MembershipLevel.REGULAR };
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { membershipLevel: true },
      });
      return { membershipLevel: user?.membershipLevel ?? MembershipLevel.REGULAR };
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 搜索框 */}
      <form
        action="/"
        method="GET"
        className="flex gap-3 max-w-xl mx-auto mb-8"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="搜索商品..."
          className="flex-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          搜索
        </button>
      </form>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={q ? `/?q=${encodeURIComponent(q)}` : "/"}
          className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
            !categorySlug
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          全部
        </Link>
        {categories.map((cat) => {
          const catHref = cat.slug === categorySlug
            ? (q ? `/?q=${encodeURIComponent(q)}` : "/")
            : `/?category=${cat.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={cat.id}
              href={catHref}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                cat.slug === categorySlug
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
              <span className="ml-1 text-xs opacity-60">({cat._count.products})</span>
            </Link>
          );
        })}
      </div>

      {/* 搜索结果提示 */}
      {q && (
        <p className="text-sm text-gray-500 mb-4">
          搜索 &ldquo;{q}&rdquo; 共找到 {productResult.total} 件商品
        </p>
      )}

      {/* 商品网格 */}
      {productResult.items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">暂无商品</p>
          <p className="text-sm">试试其他关键词或分类</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productResult.items.map((product) => (
              <ProductCard key={product.id} {...product} userMembershipLevel={currentUser.membershipLevel} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={productResult.totalPages}
            basePath="/"
            searchParams={{ ...(q && { q }), ...(categorySlug && { category: categorySlug }) }}
          />
        </>
      )}
    </div>
  );
}

// ─── 数据加载 ────────────────────────────────────────────────────────────────

async function loadProducts({
  q,
  categorySlug,
  currentPage,
  pageSize,
}: {
  q: string;
  categorySlug: string;
  currentPage: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = { isPublished: true };

  if (q) {
    where.name = { contains: q };
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    if (category) {
      where.categoryId = category.id;
    } else {
      return { items: [], total: 0, totalPages: 0 };
    }
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        stock: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
