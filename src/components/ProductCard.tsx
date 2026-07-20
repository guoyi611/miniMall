import Link from "next/link";
import { parseImages, getFirstImage, formatPrice } from "@/lib/utils";
import { getDiscountRate } from "@/lib/membership";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images: string;
  stock: number;
  /** 当前登录用户的会员等级，用于展示会员价对比 */
  userMembershipLevel?: string;
}

export function ProductCard({
  id,
  name,
  price,
  images,
  stock,
  userMembershipLevel,
}: ProductCardProps) {
  const imageUrl = getFirstImage(images);
  const discountRate = getDiscountRate((userMembershipLevel as any) || "REGULAR");
  const memberPrice = price * (1 - discountRate);

  return (
    <Link
      href={`/products/${id}`}
      className="group bg-white rounded-xl border hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* 图片 */}
      <div className="aspect-square bg-gray-50 overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* 信息 */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {name}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-red-600">
              {formatPrice(price)}
            </span>
            {discountRate > 0 && (
              <span className="text-xs text-blue-600">
                会员价 {formatPrice(memberPrice)}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {stock <= 0 && (
              <span className="text-xs text-gray-400">暂时缺货</span>
            )}
            {stock > 0 && stock <= 10 && (
              <span className="text-xs text-orange-500">仅剩 {stock} 件</span>
            )}
            {discountRate > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {Math.round(discountRate * 100)}% OFF
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
