import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/UserMenu";

export async function Header() {
  const user = await getCurrentUser();

  // 获取购物车数量（仅已登录用户）
  let cartCount = 0;
  if (user) {
    cartCount = await prisma.cartItem.count({ where: { userId: user.id } });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-gray-900 shrink-0">
          Mini Mall
        </Link>

        {/* 右侧 */}
        <div className="flex-1" />

        {user ? (
          <UserMenu user={user} cartCount={cartCount} />
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            {/* 购物车 — 未登录点击跳转登录 */}
            <Link
              href="/auth/login"
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
            </Link>

            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              登录
            </Link>
            <Link
              href="/auth/register"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              注册
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
