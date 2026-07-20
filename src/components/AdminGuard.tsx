import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * AdminGuard — 服务端组件，非 ADMIN 角色直接重定向首页。
 * 在页面顶层 await 即可，无需 Client Component。
 *
 * 用法：
 *   export default async function AdminPage() {
 *     await ensureAdmin();   // 非管理员会自动 redirect
 *     return <div>...</div>;
 *   }
 */
export async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}
