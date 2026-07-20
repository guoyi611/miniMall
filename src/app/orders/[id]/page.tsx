"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatPrice,
  formatDate,
  getOrderStatusLabel,
  getLevelLabel,
} from "@/lib/utils";

interface OrderItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
}

interface OrderDetail {
  id: string;
  status: string;
  total: number;
  originalTotal: number;
  discount: number;
  membershipLevel: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDetail[];
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (res.status === 404) {
          setError("订单不存在");
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setOrder(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载订单失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // ─── 操作：支付 / 取消 ──────────────────────────────────────────────────
  async function handleAction(action: "pay" | "cancel") {
    if (!order) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "操作失败");
      setOrder(json.data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  // ─── 渲染 ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 mb-4">{error}</p>
        <Link href="/orders" className="text-blue-600 hover:underline text-sm">
          返回订单列表
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const canPay = order.status === "PENDING";
  const canCancel = order.status !== "CANCELLED" && order.status !== "DELIVERED";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 返回 */}
      <Link
        href="/orders"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-block"
      >
        ← 返回订单列表
      </Link>

      <h1 className="text-2xl font-bold mb-6">订单详情</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 订单基本信息 */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">订单号</span>
          <span className="text-sm font-mono text-gray-900">
            #{order.id.slice(-8).toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">状态</span>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              STATUS_CLASSES[order.status] ?? "bg-gray-50 text-gray-600"
            }`}
          >
            {getOrderStatusLabel(order.status)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">会员等级</span>
          <span className="text-sm text-gray-900">
            {getLevelLabel(order.membershipLevel)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">下单时间</span>
          <span className="text-sm text-gray-900">
            {formatDate(order.createdAt)}
          </span>
        </div>
      </div>

      {/* 商品明细 */}
      <h2 className="text-lg font-semibold mb-3">商品明细</h2>
      <ul className="divide-y mb-6">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 items-center">
            {/* 占位图片 */}
            <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
              <span className="text-gray-300 text-xl">📦</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatPrice(item.price)} × {item.quantity}
              </p>
            </div>
            <span className="text-sm font-medium text-gray-900 shrink-0">
              {formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {/* 价格汇总 */}
      <div className="border-t pt-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm text-gray-500">
          <span>商品原价</span>
          <span>{formatPrice(order.originalTotal)}</span>
        </div>
        {order.discount > 0 && (
          <>
            <div className="flex justify-between text-sm text-green-600">
              <span>
                会员折扣（
                {Math.round((order.discount / order.originalTotal) * 100)}%）
              </span>
              <span>−{formatPrice(order.discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
          <span>实付金额</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {canPay && (
          <button
            onClick={() => handleAction("pay")}
            disabled={acting}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium
                       hover:bg-blue-700 active:bg-blue-800
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            {acting ? "处理中..." : "模拟支付"}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => handleAction("cancel")}
            disabled={acting}
            className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl font-medium
                       hover:bg-gray-50 active:bg-gray-100
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {acting ? "处理中..." : "取消订单"}
          </button>
        )}
      </div>
    </div>
  );
}
