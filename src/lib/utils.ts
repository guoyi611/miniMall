// ─── 价格 ───────────────────────────────────────────────────────────────────

/** 格式化价格为人民币显示 */
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

/** 百分比折扣文案 */
export function formatDiscount(discountRate: number): string {
  if (discountRate <= 0) return "无优惠";
  const percent = Math.round(discountRate * 100);
  return `${percent}% OFF`;
}

// ─── 日期 ───────────────────────────────────────────────────────────────────

/** 格式化为简体中文日期时间 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

// ─── 图片 ───────────────────────────────────────────────────────────────────

/** 解析 JSON 图片数组 */
export function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 获取商品首图 */
export function getFirstImage(images: string, fallback?: string): string {
  const arr = parseImages(images);
  return arr.length > 0 ? arr[0] : `https://picsum.photos/seed/${fallback || "default"}/400/400`;
}

// ─── 订单状态 ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已发货",
  DELIVERED: "已签收",
  CANCELLED: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "yellow",
  PAID: "blue",
  SHIPPED: "purple",
  DELIVERED: "green",
  CANCELLED: "red",
};

export function getOrderStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getOrderStatusColor(status: string): string {
  return STATUS_COLORS[status] || "gray";
}

// ─── 会员等级 ───────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  REGULAR: "普通会员",
  XINYUE1: "心悦1级",
  XINYUE2: "心悦2级",
};

const LEVEL_COLORS: Record<string, string> = {
  REGULAR: "gray",
  XINYUE1: "blue",
  XINYUE2: "purple",
};

export function getLevelLabel(level: string): string {
  return LEVEL_LABELS[level] || level;
}

export function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] || "gray";
}
