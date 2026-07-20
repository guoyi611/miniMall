import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* 侧边导航 */}
      <aside className="w-56 bg-gray-50 border-r shrink-0">
        <AdminNav />
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
