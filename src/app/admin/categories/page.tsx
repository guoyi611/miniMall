"use client";

import { useEffect, useState } from "react";

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  _count?: { products: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 新增表单
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── 加载 ──────────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setCategories(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ─── 新增 ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
      setName("");
      setDescription("");
      fetchCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  // ─── 删除 ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`确认删除「${catName}」？该分类下的所有商品也将被删除，此操作不可撤销。`))
      return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "删除失败");
      }
      fetchCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6">分类管理</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* 新增表单 */}
      <form
        onSubmit={handleCreate}
        className="bg-white border rounded-xl p-4 mb-6 flex items-end gap-3"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            分类名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例如：数码产品"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述（可选）
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简短说明"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors shrink-0"
        >
          {saving ? "创建中..." : "创建"}
        </button>
      </form>

      {/* 列表 */}
      {loading ? (
        <p className="text-center text-gray-400 py-16">加载中...</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">分类名</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">描述</th>
                <th className="text-center px-4 py-3 font-medium">商品数</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {c._count?.products ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-12">
                    暂无分类
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
