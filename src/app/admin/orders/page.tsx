"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  formatDate,
  getOrderStatusLabel,
  getLevelLabel,
} from "@/lib/utils";

interface OrderUser {
  id: string;
  name: string;
  email: string;
}

interface OrderItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
}

interface AdminOrder {
  id: string;
  status: string;
  total: number;
  originalTotal: number;
  discount: number;
  membershipLevel: string;
  createdAt: string;
  user: OrderUser;
  items: OrderItemDetail[];
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const pageSize = 15;

  // ─── 加载 ──────────────────────────────────────────────────────────────────
  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (levelFilter) params.set("level", levelFilter);
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setOrders(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
  }, [page, statusFilter, levelFilter]);

  // ─── 状态变更 ──────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新失败");
      fetchOrders(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">订单管理</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 筛选栏 */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待付款</option>
          <option value="PAID">已付款</option>
          <option value="SHIPPED">已发货</option>
          <option value="DELIVERED">已签收</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">全部等级</option>
          <option value="REGULAR">普通会员</option>
          <option value="XINYUE1">心悦1级</option>
          <option value="XINYUE2">心悦2级</option>
        </select>
        <span className="text-sm text-gray-400 self-center">共 {total} 单</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-16">加载中...</p>
      ) : (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">订单号</th>
                  <th className="text-left px-4 py-3 font-medium">用户</th>
                  <th className="text-left px-4 py-3 font-medium">商品</th>
                  <th className="text-right px-4 py-3 font-medium">金额</th>
                  <th className="text-center px-4 py-3 font-medium">等级</th>
                  <th className="text-center px-4 py-3 font-medium">状态</th>
                  <th className="text-center px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-900">
                        #{o.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formatDate(o.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900">{o.user.name}</span>
                      <span className="block text-xs text-gray-400">
                        {o.user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 line-clamp-1 max-w-[200px]">
                        {o.items.map((i) => i.name).join("、")}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {o.items.length} 件
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">
                        {formatPrice(o.total)}
                      </span>
                      {o.discount > 0 && (
                        <span className="block text-xs text-green-600">
                          −{formatPrice(o.discount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-600">
                        {getLevelLabel(o.membershipLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_CLASSES[o.status] ?? "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {getOrderStatusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {STATUS_FLOW[o.status]?.map((next) => (
                          <button
                            key={next}
                            onClick={() => handleStatusChange(o.id, next)}
                            disabled={actingId === o.id}
                            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors disabled:opacity-30 ${
                              next === "CANCELLED"
                                ? "border border-red-300 text-red-600 hover:bg-red-50"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {getOrderStatusLabel(next)}
                          </button>
                        ))}
                        {STATUS_FLOW[o.status]?.length === 0 && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-12">
                      暂无订单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>共 {total} 单</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-30"
                >
                  上一页
                </button>
                <span className="px-3 py-1">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-30"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
