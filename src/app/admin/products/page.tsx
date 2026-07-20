"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  formatDate,
  getOrderStatusLabel,
  getLevelLabel,
} from "@/lib/utils";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isPublished: boolean;
  category: { id: string; name: string };
  createdAt: string;
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

const FORM_INIT: Record<string, string | number | boolean> = {
  name: "",
  price: "",
  stock: "",
  categoryId: "",
  description: "",
  images: "",
  isPublished: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_INIT });
  const [saving, setSaving] = useState(false);

  // ─── 加载 ──────────────────────────────────────────────────────────────────
  const fetchProducts = async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      if (search) params.set("q", search);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setProducts(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.data);
    }
  };

  useEffect(() => {
    fetchProducts(page);
    fetchCategories();
  }, [page, categoryFilter]);

  // ─── 表单 ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...FORM_INIT });
    setShowForm(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      stock: p.stock,
      categoryId: p.category.id,
      description: "",
      images: "",
      isPublished: p.isPublished,
    });
    setShowForm(true);
  };

  const setField = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const imageList = form.images
      ? String(form.images)
          .split(/[,;\n]+/)
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    const body = {
      name: form.name,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      categoryId: form.categoryId,
      description: form.description,
      images: imageList,
      isPublished: form.isPublished,
    };

    const url = editingId
      ? `/api/admin/products/${editingId}`
      : "/api/admin/products";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      setShowForm(false);
      fetchProducts(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // ─── 删除 ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除「${name}」？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "删除失败");
      }
      fetchProducts(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">商品管理</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增商品
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 搜索 + 分类筛选 */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索商品名..."
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              fetchProducts(1);
            }
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "编辑商品" : "新增商品"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品名 *
                </label>
                <input
                  type="text"
                  value={form.name as string}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类 *
                </label>
                <select
                  value={form.categoryId as string}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  价格 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price as string}
                  onChange={(e) => setField("price", e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  库存
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.stock as string}
                  onChange={(e) => setField("stock", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={form.description as string}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片 URL（逗号/换行分隔）
                </label>
                <textarea
                  value={form.images as string}
                  onChange={(e) => setField("images", e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isPublished as boolean}
                    onChange={(e) => setField("isPublished", e.target.checked)}
                    className="rounded"
                  />
                  上架（下架后用户不可见）
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 表格 */}
      {loading ? (
        <p className="text-center text-gray-400 py-16">加载中...</p>
      ) : (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">商品名</th>
                  <th className="text-left px-4 py-3 font-medium">分类</th>
                  <th className="text-right px-4 py-3 font-medium">价格</th>
                  <th className="text-right px-4 py-3 font-medium">库存</th>
                  <th className="text-center px-4 py-3 font-medium">状态</th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-400">{p.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category.name}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={p.stock === 0 ? "text-red-500" : "text-gray-900"}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isPublished
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.isPublished ? "上架" : "下架"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-blue-600 hover:underline text-xs mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-12">
                      暂无商品
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>共 {total} 件</span>
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
