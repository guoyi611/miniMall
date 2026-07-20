"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    membershipLevel: string;
    totalSpent: number;
    createdAt: Date;
  };
  cartCount: number;
}

export function UserMenu({ user, cartCount }: UserMenuProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("退出失败，请重试");
      router.push("/");
      router.refresh();
    } catch (e) {
      setLogoutError(e instanceof Error ? e.message : "退出失败");
      setLoggingOut(false);
    }
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      {/* 购物车 */}
      <Link
        href="/cart"
        className="relative inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5.4a1 1 0 00.9 1.4h12.8a1 1 0 00.9-1.4L17 13m-4 6a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2z"
          />
        </svg>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-2 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>

      {/* 用户信息 */}
      <Link
        href="/orders"
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        我的订单
      </Link>
      <span className="text-gray-300">|</span>
      <span className="text-gray-500 text-xs">{user.name}</span>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
      >
        {loggingOut ? "..." : "退出"}
      </button>
      {logoutError && (
        <span className="text-xs text-red-500">{logoutError}</span>
      )}
    </nav>
  );
}
