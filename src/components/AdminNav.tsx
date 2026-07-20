"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/products", label: "商品管理" },
  { href: "/admin/orders", label: "订单管理" },
  { href: "/admin/categories", label: "分类管理" },
  { href: "/admin/users", label: "用户管理" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="py-4">
      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        后台管理
      </div>
      <ul className="space-y-1 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
