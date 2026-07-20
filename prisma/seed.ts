import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── 清空数据 ──────────────────────────────────────────────────────────────
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ─── 管理员账号 ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "管理员",
      email: "admin@minimall.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // ─── 测试用户 ──────────────────────────────────────────────────────────────
  const userPassword = await bcrypt.hash("user123", 10);
  await prisma.user.create({
    data: {
      name: "测试用户",
      email: "user@minimall.com",
      password: userPassword,
      role: "USER",
    },
  });

  // ─── 分类 ──────────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "电子产品", slug: "electronics", description: "手机、电脑、数码配件" },
    }),
    prisma.category.create({
      data: { name: "服装", slug: "clothing", description: "男装、女装、童装" },
    }),
    prisma.category.create({
      data: { name: "家居生活", slug: "home-living", description: "家具、日用品、厨房用品" },
    }),
    prisma.category.create({
      data: { name: "图书", slug: "books", description: "文学、科技、教育" },
    }),
    prisma.category.create({
      data: { name: "食品", slug: "food", description: "零食、饮料、生鲜" },
    }),
  ]);

  // ─── 商品图片映射 ────────────────────────────────────────────────────────
  const imageMap: Record<string, string> = {
    "iPhone 16 Pro": "smartphone.svg",
    "MacBook Air M4": "laptop.svg",
    "AirPods Pro 3": "earbuds.svg",
    "机械键盘 K99": "keyboard.svg",
    "纯棉T恤 白色": "tshirt.svg",
    "直筒牛仔裤": "jeans.svg",
    "连帽卫衣 灰色": "hoodie.svg",
    "羊毛大衣 黑色": "coat.svg",
    "北欧台灯": "lamp.svg",
    "乳胶枕": "pillow.svg",
    "不锈钢保温杯": "thermos.svg",
    "编程珠玑 第2版": "book-programming.svg",
    "深入理解计算机系统": "book-cs.svg",
    "设计模式 可复用面向对象软件的基础": "book-design.svg",
    "混合坚果 500g": "nuts.svg",
    "冻干咖啡 100g": "coffee.svg",
  };

  // ─── 商品 ──────────────────────────────────────────────────────────────────
  const products = [
    { name: "iPhone 16 Pro", price: 8999, stock: 50, category: categories[0] },
    { name: "MacBook Air M4", price: 7999, stock: 30, category: categories[0] },
    { name: "AirPods Pro 3", price: 1999, stock: 100, category: categories[0] },
    { name: "机械键盘 K99", price: 399, stock: 200, category: categories[0] },
    { name: "纯棉T恤 白色", price: 99, stock: 500, category: categories[1] },
    { name: "直筒牛仔裤", price: 259, stock: 300, category: categories[1] },
    { name: "连帽卫衣 灰色", price: 199, stock: 200, category: categories[1] },
    { name: "羊毛大衣 黑色", price: 1299, stock: 50, category: categories[1] },
    { name: "北欧台灯", price: 299, stock: 150, category: categories[2] },
    { name: "乳胶枕", price: 199, stock: 200, category: categories[2] },
    { name: "不锈钢保温杯", price: 89, stock: 500, category: categories[2] },
    { name: "编程珠玑 第2版", price: 59, stock: 1000, category: categories[3] },
    { name: "深入理解计算机系统", price: 139, stock: 800, category: categories[3] },
    { name: "设计模式 可复用面向对象软件的基础", price: 45, stock: 600, category: categories[3] },
    { name: "混合坚果 500g", price: 69, stock: 300, category: categories[4] },
    { name: "冻干咖啡 100g", price: 89, stock: 200, category: categories[4] },
  ];

  for (const product of products) {
    const slug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]+/g, "-")
      .replace(/^-|-$/g, "");
    await prisma.product.create({
      data: {
        name: product.name,
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${product.name} — 精选商品，品质保证。`,
        price: product.price,
        images: JSON.stringify([`/images/products/${imageMap[product.name]}`]),
        stock: product.stock,
        categoryId: product.category.id,
      },
    });
  }

  console.log("✅ 种子数据写入完成");
  console.log("   管理员: admin@minimall.com / admin123");
  console.log("   用户:   user@minimall.com   / user123");
}

main()
  .catch((e) => {
    console.error("❌ 种子数据写入失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
