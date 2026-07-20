"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AddToCartButtonProps {
  productId: string;
  disabled?: boolean;
}

export function AddToCartButton({
  productId,
  disabled,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleAdd() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const json = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (res.status === 404) {
        setMessage("购物车功能即将开放");
        return;
      }

      if (!res.ok) throw new Error(json.error || "添加失败");

      setMessage("已加入购物车");
      setTimeout(() => setMessage(null), 2000);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "添加失败，请重试");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAdd}
        disabled={disabled || loading}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-medium
                   hover:bg-blue-700 active:bg-blue-800
                   disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? "添加中..." : disabled ? "暂时缺货" : "加入购物车"}
      </button>
      {message && (
        <p className="text-sm text-center text-green-600">{message}</p>
      )}
    </div>
  );
}
