"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { formatPrice, getFirstImage, getLevelLabel } from "@/lib/utils";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  images: string;
  stock: number;
  isPublished: boolean;
  slug: string;
}

interface CartItem {
  id: string;
  quantity: number;
  product: CartProduct;
}

interface CartData {
  items: CartItem[];
  membershipLevel: string;
  discountRate: number;
}

const LEVEL_BADGE: Record<string, string> = {
  REGULAR: "bg-gray-100 text-gray-600",
  XINYUE1: "bg-blue-50 text-blue-700",
  XINYUE2: "bg-purple-50 text-purple-700",
};

export default function CartPage() {
  const router = useRouter();
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ─── 获取购物车 ──────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载购物车失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // ─── 修改数量 ────────────────────────────────────────────────────────────
  async function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return;
    setUpdatingId(itemId);
    setError("");
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新失败");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, quantity: newQty } : item
          ),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── 删除 ────────────────────────────────────────────────────────────────
  async function removeItem(itemId: string) {
    setUpdatingId(itemId);
    setError("");
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "删除失败");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── 提交订单 ────────────────────────────────────────────────────────────
  async function handleSubmitOrder() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "下单失败");
      router.push(`/orders/${json.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "下单失败");
    } finally {
      setSubmitting(false);
    }
  }
  const items = data?.items ?? [];
  const discountRate = data?.discountRate ?? 0;
  const membershipLevel = data?.membershipLevel ?? "REGULAR";

  /** 计算会员折扣后单价 */
  function memberPrice(price: number): number {
    return Math.round(price * (1 - discountRate) * 100) / 100;
  }

  const originalTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalDiscount = Math.round(originalTotal * discountRate * 100) / 100;
  const finalTotal = Math.round((originalTotal - totalDiscount) * 100) / 100;
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  // ─── 渲染 ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">购物车</h1>

      {/* 会员等级提示 */}
      {items.length > 0 && (
        <div className="mb-6">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              LEVEL_BADGE[membershipLevel] ?? LEVEL_BADGE.REGULAR
            }`}
          >
            {getLevelLabel(membershipLevel)}
          </span>
          {discountRate > 0 && (
            <span className="ml-2 text-xs text-green-600">
              享 {Math.round(discountRate * 100)}% 折扣
            </span>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 空购物车 */}
      {items.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5.4a1 1 0 00.9 1.4h12.8a1 1 0 00.9-1.4L17 13m-4 6a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2z"
            />
          </svg>
          <p className="text-lg mb-4">购物车是空的</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            去逛逛
          </Link>
        </div>
      )}

      {/* 商品列表 */}
      {items.length > 0 && (
        <>
          <ul className="divide-y">
            {items.map((item) => {
              const price = item.product.price;
              const discounted = memberPrice(price);
              const hasDiscount = discountRate > 0;
              const itemSubtotal = hasDiscount
                ? discounted * item.quantity
                : price * item.quantity;
              const itemOriginalSubtotal = price * item.quantity;

              return (
                <li key={item.id} className="flex gap-4 py-5 items-start">
                  {/* 商品图片 */}
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="shrink-0"
                  >
                    <Image
                      src={getFirstImage(
                        item.product.images,
                        item.product.id
                      )}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover rounded-xl bg-gray-100"
                    />
                  </Link>

                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                    >
                      {item.product.name}
                    </Link>

                    {/* 价格区域 */}
                    <div className="mt-1.5 flex items-baseline gap-2">
                      {hasDiscount ? (
                        <>
                          <span className="text-sm font-semibold text-red-600">
                            {formatPrice(discounted)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(price)}
                        </span>
                      )}
                    </div>

                    {/* 行小计 */}
                    <p className="text-xs text-gray-400 mt-1">
                      小计{" "}
                      {hasDiscount ? (
                        <>
                          <span className="text-red-600 font-medium">
                            {formatPrice(itemSubtotal)}
                          </span>
                          <span className="line-through ml-1">
                            {formatPrice(itemOriginalSubtotal)}
                          </span>
                        </>
                      ) : (
                        formatPrice(itemSubtotal)
                      )}
                    </p>

                    {/* 数量调整 */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={
                          updatingId === item.id || item.quantity <= 1
                        }
                        className="w-7 h-7 flex items-center justify-center
                                   border rounded-md text-gray-500
                                   hover:bg-gray-50 disabled:opacity-30
                                   disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={
                          updatingId === item.id ||
                          item.quantity >= item.product.stock
                        }
                        className="w-7 h-7 flex items-center justify-center
                                   border rounded-md text-gray-500
                                   hover:bg-gray-50 disabled:opacity-30
                                   disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                      {item.quantity >= item.product.stock && (
                        <span className="text-xs text-orange-500">
                          已达库存上限
                        </span>
                      )}
                    </div>

                    {/* 库存不足警告 */}
                    {!item.product.isPublished && (
                      <p className="text-xs text-red-500 mt-1">
                        该商品已下架，请删除
                      </p>
                    )}
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={updatingId === item.id}
                    className="shrink-0 text-xs text-gray-400 hover:text-red-500
                               disabled:opacity-30 transition-colors mt-1"
                  >
                    删除
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 底部总计 + 提交 */}
          <div className="mt-8 border-t pt-5 space-y-3">
            {/* 价格明细 */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>
                  共 {totalQuantity} 件商品（原价）
                </span>
                <span>{formatPrice(originalTotal)}</span>
              </div>

              {discountRate > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>
                      会员折扣（
                      {Math.round(discountRate * 100)}%）
                    </span>
                    <span>−{formatPrice(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>下单时以 {getLevelLabel(membershipLevel)} 等级结算</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                <span>合计</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting || items.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium
                         hover:bg-blue-700 active:bg-blue-800
                         disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "提交中..." : "提交订单"}
            </button>
            {discountRate > 0 && (
              <p className="text-xs text-green-600 text-center">
                已为您节省 {formatPrice(totalDiscount)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
