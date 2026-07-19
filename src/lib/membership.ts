import type { User } from "@/generated/prisma/client";

// ─── 会员等级 ───────────────────────────────────────────────────────────────

export enum MembershipLevel {
  REGULAR = "REGULAR",
  XINYUE1 = "XINYUE1",
  XINYUE2 = "XINYUE2",
}

/** 升级门槛（累计消费额） */
const THRESHOLDS: Record<MembershipLevel, number> = {
  [MembershipLevel.REGULAR]: 0,
  [MembershipLevel.XINYUE1]: 8_000,
  [MembershipLevel.XINYUE2]: 80_000,
};

/** 折扣率 */
const DISCOUNT_RATES: Record<MembershipLevel, number> = {
  [MembershipLevel.REGULAR]: 0,
  [MembershipLevel.XINYUE1]: 0.05, // 9.5折
  [MembershipLevel.XINYUE2]: 0.1, // 9折
};

const LEVEL_ORDER = [
  MembershipLevel.REGULAR,
  MembershipLevel.XINYUE1,
  MembershipLevel.XINYUE2,
];

// ─── 查询 ───────────────────────────────────────────────────────────────────

/** 根据累计消费额返回对应会员等级 */
export function getMembershipLevel(totalSpent: number): MembershipLevel {
  if (totalSpent >= THRESHOLDS[MembershipLevel.XINYUE2]) {
    return MembershipLevel.XINYUE2;
  }
  if (totalSpent >= THRESHOLDS[MembershipLevel.XINYUE1]) {
    return MembershipLevel.XINYUE1;
  }
  return MembershipLevel.REGULAR;
}

/** 根据会员等级返回折扣率（0 ~ 1） */
export function getDiscountRate(level: MembershipLevel): number {
  return DISCOUNT_RATES[level];
}

// ─── 折扣计算 ───────────────────────────────────────────────────────────────

export interface DiscountResult {
  /** 原始总价 */
  originalTotal: number;
  /** 优惠金额 */
  discount: number;
  /** 折后总价（实付） */
  total: number;
}

/** 根据原始金额和会员等级计算折扣（精确到分） */
export function applyDiscount(
  originalTotal: number,
  level: MembershipLevel
): DiscountResult {
  const rate = getDiscountRate(level);
  const discount = round(originalTotal * rate);
  const total = round(originalTotal - discount);
  return { originalTotal, discount, total };
}

// ─── 升级逻辑 ───────────────────────────────────────────────────────────────

/**
 * 检查用户累计消费是否达到升级门槛。
 * 只升不降 — 保留历史最高等级。
 */
export function getUpgradedLevel(
  currentLevel: MembershipLevel,
  totalSpent: number
): MembershipLevel {
  const newLevel = getMembershipLevel(totalSpent);
  return LEVEL_ORDER.indexOf(newLevel) > LEVEL_ORDER.indexOf(currentLevel)
    ? newLevel
    : currentLevel;
}

/**
 * 获取下一级所需金额（用于进度条展示）。
 * 返回 null 表示已满级。
 */
export function getNextLevelRequirement(
  level: MembershipLevel
): { level: MembershipLevel; amount: number } | null {
  const currentIdx = LEVEL_ORDER.indexOf(level);
  if (currentIdx >= LEVEL_ORDER.length - 1) return null;
  const nextLevel = LEVEL_ORDER[currentIdx + 1];
  return { level: nextLevel, amount: THRESHOLDS[nextLevel] };
}

/**
 * 获取升级进度信息（用于前端展示）。
 */
export function getUpgradeProgress(user: {
  totalSpent: number;
  membershipLevel: MembershipLevel;
}): {
  currentLevel: string;
  currentSpent: number;
  nextLevel: string | null;
  nextThreshold: number | null;
  progressPercent: number;
} {
  const { totalSpent, membershipLevel: level } = user;
  const next = getNextLevelRequirement(level);
  const currentThreshold =
    THRESHOLDS[level as keyof typeof THRESHOLDS] ?? 0;

  if (!next) {
    return {
      currentLevel: level,
      currentSpent: totalSpent,
      nextLevel: null,
      nextThreshold: null,
      progressPercent: 100,
    };
  }

  const progress = Math.min(
    100,
    ((totalSpent - currentThreshold) / (next.amount - currentThreshold)) * 100
  );

  return {
    currentLevel: level,
    currentSpent: totalSpent,
    nextLevel: next.level,
    nextThreshold: next.amount,
    progressPercent: Math.round(progress),
  };
}

// ─── 内部工具 ───────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
