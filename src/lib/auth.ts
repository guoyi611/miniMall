import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_EXPIRES_IN = "7d";
const TOKEN_COOKIE_NAME = "token";

// ─── 类型 ──────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  role: string;
}

interface JwtPayload extends SessionPayload {
  iat?: number;
  exp?: number;
}

// ─── 密码 ───────────────────────────────────────────────────────────────────

/** 用 bcryptjs 哈希密码（cost=10） */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** 验证密码是否匹配 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** @deprecated 使用 verifyPassword 代替 */
export const comparePassword = verifyPassword;

// ─── Session 管理 ──────────────────────────────────────────────────────────

/**
 * 创建会话 — 把 userId 和 role 写入 httpOnly Cookie。
 * 返回 Set-Cookie 头字符串，用于 Response.headers.append('Set-Cookie', ...)
 */
export function setSession(userId: string, role: string): string {
  const token = jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TOKEN_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${
    7 * 24 * 60 * 60
  }; SameSite=Lax${secure}`;
}

/**
 * 从 Cookie 读取当前会话信息。
 * 返回 null 表示未登录或 token 无效。
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.userId || !payload.role) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * 获取当前登录用户的完整信息（不含密码）。
 * 返回 null 表示未登录。
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipLevel: true,
      totalSpent: true,
      createdAt: true,
    },
  });
}

/**
 * 清除 Cookie（退出登录）。
 * 返回 Set-Cookie 头字符串。
 */
export function clearSession(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

// ─── 兼容层（已有代码引用） ───────────────────────────────────────────────

/** @deprecated 使用 getSession() 代替 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

/** 从 Request 对象中提取 token（用于 middleware） */
export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]*)`)
  );
  return match ? match[1] : null;
}
