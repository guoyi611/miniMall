import type {
  CartItem,
  Order,
  OrderItem,
  Product,
  User,
} from "@/generated/prisma/client";

// ─── 通用 API 响应 ──────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── 认证 ────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipLevel: string;
  totalSpent: number;
  createdAt: Date;
}

// ─── 商品 ────────────────────────────────────────────────────────────────────

export interface ProductWithCategory extends Product {
  category: { id: string; name: string; slug: string };
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string;
  stock: number;
  category: { id: string; name: string; slug: string };
}

// ─── 购物车 ─────────────────────────────────────────────────────────────────

export interface CartItemWithProduct extends CartItem {
  product: Pick<Product, "id" | "name" | "price" | "images" | "stock">;
}

// ─── 订单 ────────────────────────────────────────────────────────────────────

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderListItem extends Order {
  items: Pick<OrderItem, "id" | "name" | "price" | "quantity">[];
}

// ─── 分类 ────────────────────────────────────────────────────────────────────

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { products: number };
}

// ─── 管理后台统计 ─────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  membershipBreakdown: Record<string, number>;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipLevel: string;
  totalSpent: number;
  _count: { orders: number };
  createdAt: Date;
}
