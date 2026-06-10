import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  total: integer('total').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
  qty: integer('qty').notNull(),
  snapshotItem: jsonb('snapshot_item').notNull(),
});

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id),
  token: text('token').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
    qty: integer('qty').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userMenuUnique: uniqueIndex('cart_items_user_menu_unique').on(
      table.userId,
      table.menuItemId,
    ),
  }),
);

export type MenuItemRecord = typeof menuItems.$inferSelect;
export type CartItemRecord = typeof cartItems.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
