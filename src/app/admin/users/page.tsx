"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDate, getLevelLabel } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipLevel: string;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
}

const LEVEL_OPTIONS = [
  { value: "", label: "全部等级" },
  { value: "REGULAR", label: "普通会员" },
  { value: "XINYUE1", label: "心悦1级" },
  { value: "XINYUE2", label: "心悦2级" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 15;

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      if (search) params.set("q", search);
      if (levelFilter) params.set("level", levelFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setUsers(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page, levelFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">用户管理</h1>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 搜索 + 筛选 */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名或邮箱..."
            className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </form>

        <select
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      {loading ? (
        <p className="text-center text-gray-400 py-16">加载中...</p>
      ) : (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">用户名</th>
                  <th className="text-left px-4 py-3 font-medium">邮箱</th>
                  <th className="text-left px-4 py-3 font-medium">角色</th>
                  <th className="text-left px-4 py-3 font-medium">会员等级</th>
                  <th className="text-right px-4 py-3 font-medium">累计消费</th>
                  <th className="text-right px-4 py-3 font-medium">订单数</th>
                  <th className="text-left px-4 py-3 font-medium">注册时间</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {u.role === "ADMIN" ? "管理员" : "用户"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.membershipLevel === "XINYUE2"
                            ? "bg-purple-50 text-purple-700"
                            : u.membershipLevel === "XINYUE1"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getLevelLabel(u.membershipLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatPrice(u.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-right">{u._count.orders}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-12">
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>共 {total} 人</span>
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
