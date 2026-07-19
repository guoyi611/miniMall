# Mini Mall — 微型电商项目

## 技术栈
- **框架**: Next.js 16 (App Router) + TypeScript
- **ORM**: Prisma 7 + SQLite (@prisma/adapter-libsql + @libsql/client)
- **样式**: TailwindCSS 4
- **认证**: JWT (jsonwebtoken + bcryptjs)，httpOnly cookie 存储
- **路径别名**: `@/` → `./src/`

## 项目架构

```
┌─ Next.js 16 App Router ────────────────────────┐
│  src/                                           │
│   ├── app/         (Shop) 商城页面               │
│   │   (Auth)      登录/注册                      │
│   │   (Admin)     后台管理                       │
│   │   api/        REST API 路由                  │
│   ├── components/  共享 UI 组件                  │
│   └── lib/         工具层（prisma, auth, ...）    │
├─ Prisma 7 + SQLite ─────────────────────────────┤
│  prisma/schema.prisma  数据模型                  │
│  prisma/seed.ts        种子数据                  │
└─────────────────────────────────────────────────┘
```

**认证方案**: JWT 自包含，不依赖 NextAuth。登录生成 token 存入 httpOnly cookie，middleware 解析 cookie 保护路由，API 层通过 `getAuthUser()` 获取当前用户。

**数据获取**: Server Components 负责数据获取和首屏渲染，Client Components 负责交互。

**会员折扣**: 价格计算全部在服务端 API 层完成，绝不信任客户端传入的折扣信息。

---

## 数据模型 (prisma/schema.prisma)

### 枚举
| 枚举 | 值 |
|------|-----|
| `UserRole` | USER, ADMIN |
| `MembershipLevel` | REGULAR（普通）, XINYUE1（心悦1级）, XINYUE2（心悦2级） |
| `OrderStatus` | PENDING, PAID, SHIPPED, DELIVERED, CANCELLED |

### 模型关系图
```
User ──< CartItem >── Product
User ──< Order ──< OrderItem >── Product
Category ──< Product
```

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 用户名 |
| email | String (unique) | 登录邮箱 |
| password | String | bcrypt 哈希 |
| role | UserRole (default USER) | 角色 |
| membershipLevel | MembershipLevel (default REGULAR) | 当前会员等级 |
| totalSpent | Float (default 0) | 累计消费 |
| createdAt | DateTime | |
| updatedAt | DateTime (updatedAt) | |

### Product
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 商品名 |
| slug | String (unique) | URL 友好标识 |
| description | String? | 描述 |
| price | Float | 价格 |
| images | String (default "[]") | JSON 数组图片 URL |
| stock | Int (default 0) | 库存 |
| isPublished | Boolean (default true) | 上下架 |
| categoryId | String | FK → Category |
| createdAt | DateTime | |
| updatedAt | DateTime (updatedAt) | |

### Category
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 分类名 |
| slug | String (unique) | URL 标识 |
| description | String? | 描述 |
| createdAt | DateTime | |
| updatedAt | DateTime (updatedAt) | |

### CartItem
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| userId | String | FK → User |
| productId | String | FK → Product |
| quantity | Int (default 1) | 数量 |
| createdAt | DateTime | |
| **约束** | @@unique([userId, productId]) | 同一用户对同一商品只有一条记录 |

### Order
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| userId | String | FK → User |
| status | OrderStatus (default PENDING) | 订单状态 |
| total | Float | 折后总价（实付金额） |
| originalTotal | Float | 折前原价总额 |
| discount | Float (default 0) | 优惠金额 |
| membershipLevel | MembershipLevel | 下单时的会员等级快照 |
| createdAt | DateTime | |
| updatedAt | DateTime (updatedAt) | |

### OrderItem
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| orderId | String | FK → Order |
| productId | String | FK → Product |
| name | String | 商品名快照 |
| price | Float | 下单时单价快照（原价） |
| quantity | Int | 数量 |
| createdAt | DateTime | |

> Order 表记录 `originalTotal`、`discount`、`membershipLevel` 快照，便于对账和追溯。即使后续升级也不影响历史订单记录。

---

## 会员体系

| 等级 | 累计消费门槛 | 折扣率 | 文字说明 |
|------|------------|--------|---------|
| REGULAR（普通会员） | 0 | 0%（无折扣） | 默认注册等级 |
| XINYUE1（心悦1级） | ≥ ¥8,000 | 5%（9.5折） | 消费达标自动升级 |
| XINYUE2（心悦2级） | ≥ ¥80,000 | 10%（9折） | 高消费用户权益 |

### 核心逻辑 (`src/lib/membership.ts`)
- `getMembershipLevel(totalSpent)` — 根据累计消费额返回对应等级
- `getDiscountRate(level)` — 根据等级返回折扣率（0 / 0.05 / 0.1）
- `applyUpgrade(user)` — 下单后检查累计消费是否达到升级门槛

### 下单流程
```
下单请求
  → 获取当前用户 membershipLevel 和折扣率
  → 计算 originalTotal（购物车商品原价总和）
  → 计算 discount = originalTotal × (1 - 折扣率)
  → 计算 finalTotal = originalTotal - discount
  → 创建 Order（记录 originalTotal, discount, membershipLevel 快照）
  → 模拟支付成功，status → PAID
  → 更新用户 totalSpent += finalTotal
  → 调用 applyUpgrade() 检查是否达到新等级门槛
  → 返回订单信息
```

---

## API 路由设计 (`src/app/api/`)

### 认证
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册（name, email, password） |
| `/api/auth/login` | POST | 登录（email, password → 设置 cookie） |
| `/api/auth/me` | GET | 获取当前用户（含会员信息） |

### 商品
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/products` | GET | 商品列表（搜索 ?q=, 分类 ?categoryId=, 分页 ?page=&pageSize=） |
| `/api/products/[id]` | GET | 商品详情 |

### 分类
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/categories` | GET | 分类列表 |

### 购物车 (需登录)
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/cart` | GET | 购物车列表 |
| `/api/cart` | POST | 添加商品（{productId, quantity}） |
| `/api/cart/[productId]` | PATCH | 修改数量（{quantity}） |
| `/api/cart/[productId]` | DELETE | 删除购物车项 |

### 订单 (需登录)
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/orders` | GET | 我的订单列表 |
| `/api/orders` | POST | 创建订单（含会员折扣计算 → 模拟支付） |
| `/api/orders/[id]` | GET | 订单详情 |

### 后台管理 (需 ADMIN)
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/admin/products` | GET/POST | 商品列表 / 新增商品 |
| `/api/admin/products/[id]` | PUT/DELETE | 编辑 / 删除商品 |
| `/api/admin/categories` | GET/POST/PUT/DELETE | 分类 CRUD |
| `/api/admin/orders` | GET | 所有订单（按等级筛选） |
| `/api/admin/orders/[id]` | PATCH | 更新订单状态 |
| `/api/admin/users` | GET | 用户列表（含会员等级和消费额） |

---

## 页面路由 (`src/app/`)

### 公开页面
| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | `page.tsx` | 首页（商品瀑布流 + 分类导航 + 搜索入口） |
| `/products` | `products/page.tsx` | 商品列表（搜索、分类筛选、排序、分页） |
| `/products/[id]` | `products/[id]/page.tsx` | 商品详情（价格、描述、加购按钮） |

### 认证页面
| 路由 | 文件 | 说明 |
|------|------|------|
| `/auth/login` | `auth/login/page.tsx` | 登录页 |
| `/auth/register` | `auth/register/page.tsx` | 注册页 |

### 用户页面 (需登录)
| 路由 | 文件 | 说明 |
|------|------|------|
| `/cart` | `cart/page.tsx` | 购物车（显示会员价、折扣提示） |
| `/orders` | `orders/page.tsx` | 我的订单列表 |
| `/orders/[id]` | `orders/[id]/page.tsx` | 订单详情 |
| `/profile` | `profile/page.tsx` | 个人中心（会员等级、累计消费、升级进度条） |

### 后台管理页面 (需 ADMIN)
| 路由 | 文件 | 说明 |
|------|------|------|
| `/admin` | `admin/page.tsx` | 仪表盘（含会员统计数据） |
| `/admin/products` | `admin/products/page.tsx` | 商品管理 |
| `/admin/products/new` | `admin/products/new/page.tsx` | 新增商品 |
| `/admin/products/[id]/edit` | `admin/products/[id]/edit/page.tsx` | 编辑商品 |
| `/admin/categories` | `admin/categories/page.tsx` | 分类管理 |
| `/admin/orders` | `admin/orders/page.tsx` | 订单管理（按等级筛选） |
| `/admin/orders/[id]` | `admin/orders/[id]/page.tsx` | 订单详情审核 |
| `/admin/users` | `admin/users/page.tsx` | 会员管理（等级、消费额） |

---

## 组件树 (`src/components/`)

### UI 原子组件 (`ui/`)
| 组件 | 说明 |
|------|------|
| `Button.tsx` | 按钮（variant: primary/outline/ghost, size: sm/md/lg） |
| `Input.tsx` | 输入框 |
| `Badge.tsx` | 标签（用于订单状态、会员等级等） |
| `Modal.tsx` | 模态框 |

### 业务组件
| 组件 | 说明 |
|------|------|
| `Header.tsx` | 导航栏（Logo、搜索框、购物车图标、用户菜单、会员标签） |
| `ProductCard.tsx` | 商品卡片（封面图、名称、价格、会员价对比） |
| `ProductGrid.tsx` | 商品网格列表 |
| `Pagination.tsx` | 分页 |
| `CartDrawer.tsx` | 侧滑购物车（显示折扣提示） |
| `MembershipBadge.tsx` | 会员等级徽章（颜色 + 文案） |
| `PriceDisplay.tsx` | 价格对比展示（原价划线 + 会员价） |
| `AuthGuard.tsx` | 登录保护（未登录 → 重定向到 /auth/login） |
| `AdminGuard.tsx` | 管理员保护（非管理员 → 重定向到首页） |

---

## 关键设计决策

1. **JWT 而非 NextAuth** — 项目小，减少依赖和配置复杂度
2. **API routes + Server Components** — Server Components 做数据获取，Client Components 做交互
3. **SQLite** — 零配置，适合迷你项目
4. **模拟支付** — 下单后自动标记 PAID，不走真实支付通道
5. **会员快照** — Order 记录下单时的 membershipLevel，升级不影响历史订单
6. **服务端定价** — 客户端不参与任何价格/折扣计算
7. **占位图片** — picsum.photos 随机占位图
8. **Prisma 7 driver adapter** — 必须通过 `@prisma/adapter-libsql` 连接 SQLite，不支持旧版 `prisma-client-js`

---

## Config & Build 说明

### 关键 npm scripts
| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run db:push` | 同步 schema 到数据库 |
| `npm run db:seed` | 写入种子数据 |
| `npm run db:studio` | Prisma Studio 可视化数据库 |

### 种子账号
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@minimall.com | admin123 |
| 测试用户 | user@minimall.com | user123 |

### Prisma + libsql 注意事项
Prisma 7 的 `prisma-client` generator 必须用 driver adapter，不能直接用 `new PrismaClient()`。
```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });
```

### TailwindCSS 4
使用 `@import "tailwindcss"` 语法（`globals.css`），配合 `@theme inline` 定义主题变量。

---

## 实现步骤

| Step | 内容 | 状态 |
|------|------|------|
| 1 | 项目初始化 + 依赖安装 | ✅ 完成 |
| 2 | Prisma schema + 种子数据 | ✅ 完成 |
| 3 | 工具层 (lib/prisma, auth, membership, utils, types) | ⏳ |
| 4 | API 路由 | ⬜ |
| 5 | UI 组件 | ⬜ |
| 6 | 前端页面 | ⬜ |
| 7 | middleware 路由保护 | ⬜ |
| 8 | 集成测试与联调 | ⬜ |

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
