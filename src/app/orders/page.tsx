"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice, formatDate, getOrderStatusLabel } from "@/lib/utils";

interface OrderItemBrief {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  originalTotal: number;
  discount: number;
  membershipLevel: string;
  createdAt: string;
  items: OrderItemBrief[];
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/orders");
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setOrders(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载订单失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">我的订单</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {orders.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-4">还没有订单</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            去逛逛
          </Link>
        </div>
      )}

      {orders.length > 0 && (
        <ul className="divide-y">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between py-4 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {/* 订单号 + 时间 */}
                  <p className="text-sm font-medium text-gray-900 truncate">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                  {/* 商品摘要 */}
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {order.items.map((i) => i.name).join("、")}
                  </p>
                  {order.discount > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      已优惠 {formatPrice(order.discount)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 ml-4 shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_CLASSES[order.status] ?? "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
