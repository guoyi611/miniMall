import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET =
  process.env.JWT_SECRET || "mini-mall-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const TOKEN_COOKIE_NAME = "token";

// ─── 类型 ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ─── 密码 ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Cookie 操作 ────────────────────────────────────────────────────────────

/** 返回 Set-Cookie 头字符串（用于 Response） */
export function setAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TOKEN_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${
    7 * 24 * 60 * 60
  }; SameSite=Lax${secure}`;
}

/** 返回清除 Cookie 的头字符串 */
export function removeAuthCookie(): string {
  return `${TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/** 在 API 路由中从 cookie 获取 token */
export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value;
}

/** 获取当前认证用户 ID（API 路由中使用） */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const token = await getTokenFromCookies();
    if (!token) return null;
    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

/** 从 Request 对象中提取 token（用于 middleware） */
export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]*)`)
  );
  return match ? match[1] : null;
}
