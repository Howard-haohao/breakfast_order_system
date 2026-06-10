import { pgTable, serial, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 菜單表
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
});

// 使用者表 (SessionUser)
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // 配合 Better Auth 或 Firebase ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
});

// 訂單表
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  total: integer('total').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, submitted, PREPARING, COMPLETED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
});

// 訂單項目表 (關聯 Order 與 MenuItem)
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
  qty: integer('qty').notNull(),
  // 記錄下單當下的快照資訊 (避免未來菜單改名或漲價影響歷史訂單)
  snapshotItem: jsonb('snapshot_item').notNull(), 
});