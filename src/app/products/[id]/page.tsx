import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate, parseImages } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";

// ─── 类型 ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── 商品详情页 ──────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, isPublished: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      images: true,
      stock: true,
      category: { select: { id: true, name: true, slug: true } },
      createdAt: true,
    },
  });

  if (!product) {
    notFound();
  }

  const images = parseImages(product.images);
  const mainImage = images[0] || `https://picsum.photos/seed/${product.id}/600/600`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 面包屑 */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          首页
        </Link>
        <span className="mx-2">/</span>
        {product.category && (
          <>
            <Link
              href={`/?category=${product.category.slug}`}
              className="hover:text-blue-600 transition-colors"
            >
              {product.category.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-gray-800">{product.name}</span>
      </nav>

      {/* 主体内容 */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* 图片 */}
        <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* 信息 */}
        <div className="flex flex-col gap-6">
          <div>
            {product.category && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl font-bold mt-2">{product.name}</h1>
          </div>

          {/* 价格 */}
          <div className="text-3xl font-bold text-red-600">
            {formatPrice(product.price)}
          </div>

          {/* 库存 */}
          <div className="text-sm">
            {product.stock > 0 ? (
              <span className="text-green-600">
                有货（库存 {product.stock} 件）
              </span>
            ) : (
              <span className="text-red-500">暂时缺货</span>
            )}
          </div>

          {/* 描述 */}
          {product.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">商品描述</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* 加入购物车 */}
          <AddToCartButton
            productId={product.id}
            disabled={product.stock <= 0}
          />

          {/* 商品信息 */}
          <div className="text-xs text-gray-400 border-t pt-4">
            <p>上架时间：{formatDate(product.createdAt, { hour: undefined, minute: undefined })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
