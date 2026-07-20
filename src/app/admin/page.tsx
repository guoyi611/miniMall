import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/components/AdminGuard";

export default async function AdminDashboard() {
  await ensureAdmin();

  const [productCount, orderCount, userCount, categoryCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.category.count(),
    ]);

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
    },
  });

  const stats = [
    { label: "商品总数", value: productCount, href: "/admin/products" },
    { label: "订单总数", value: orderCount, href: "/admin/orders" },
    { label: "用户总数", value: userCount, href: "/admin/users" },
    { label: "分类总数", value: categoryCount, href: "/admin/categories" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
          </a>
        ))}
      </div>

      {/* 最近订单 */}
      <h2 className="text-lg font-semibold mb-3">最近订单</h2>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">订单号</th>
              <th className="text-left px-4 py-3 font-medium">用户</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-center px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recentOrders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">
                  #{o.id.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-gray-600">{o.user.name}</td>
                <td className="px-4 py-3 text-right font-medium">
                  ¥{o.total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === "PENDING"
                        ? "bg-yellow-50 text-yellow-700"
                        : o.status === "PAID"
                          ? "bg-blue-50 text-blue-700"
                          : o.status === "SHIPPED"
                            ? "bg-purple-50 text-purple-700"
                            : o.status === "DELIVERED"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
