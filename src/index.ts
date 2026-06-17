import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { auth } from './auth';
import { db } from './db';
import { cartItems, menuItems, orderItems, orders } from './db/schema';
import { allowedOrigins } from './runtime';

type CurrentSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type AccessRole = 'customer' | 'staff' | 'manager';
type CartResponseItem = {
  cartItemId: number;
  menuItemId: number;
  qty: number;
  item: typeof menuItems.$inferSelect;
};
const menuCategories = ['麵食', '中式餐點', '西式餐點', '飲品'] as const;
type MenuCategory = (typeof menuCategories)[number];

type SnapshotItem = {
  name: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
};
type ActiveKitchenOrder = typeof orders.$inferSelect & {
  items: Array<{
    id: number;
    qty: number;
    snapshotItem: SnapshotItem;
  }>;
};
type AdminOrderHistoryItem = {
  id: number;
  qty: number;
  snapshotItem: SnapshotItem;
};
type AdminOrderHistoryRecord = typeof orders.$inferSelect & {
  items: AdminOrderHistoryItem[];
};
type ResponseSet = { status?: number | string };

const staffEmails = parseEmailList(process.env.STAFF_EMAILS);
const managerEmails = parseEmailList(process.env.MANAGER_EMAILS);

function parseEmailList(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getAccessForEmail(email: string | undefined) {
  const normalizedEmail = email?.toLowerCase() ?? '';
  const isManager = managerEmails.has(normalizedEmail);
  const isStaff = isManager || staffEmails.has(normalizedEmail);
  const role: AccessRole = isManager ? 'manager' : isStaff ? 'staff' : 'customer';

  return {
    role,
    canUseKitchen: isStaff,
    canManage: isManager,
  };
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isMenuCategory(value: string): value is MenuCategory {
  return (menuCategories as readonly string[]).includes(value);
}

function normalizeSalesCategory(value?: string | null): MenuCategory {
  if (value && isMenuCategory(value)) {
    return value;
  }

  if (value === '吐司' || value === '漢堡' || value === '三明治') {
    return '西式餐點';
  }
  if (value === '飲料') {
    return '飲品';
  }
  if (value === '麵類') {
    return '麵食';
  }
  return '中式餐點';
}

function getReportDateRange(dateValue: string | null) {
  const fallback = new Date();
  const match = dateValue?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const selected = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());

  const start = new Date(selected);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end, date: formatReportDate(start) };
}
function clampHistoryDays(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.min(90, Math.max(1, Math.trunc(parsed)));
}

function getHistoryDateRange(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function formatReportDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
async function getCurrentSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

async function requireSession(request: Request, set: ResponseSet) {
  const currentSession = await getCurrentSession(request);
  if (!currentSession) {
    set.status = 401;
    return null;
  }
  return currentSession;
}

async function requireStaffSession(request: Request, set: ResponseSet) {
  const currentSession = await requireSession(request, set);
  if (!currentSession) {
    return null;
  }

  const access = getAccessForEmail(currentSession.user.email);
  if (!access.canUseKitchen) {
    set.status = 403;
    return null;
  }

  return { currentSession, access };
}

async function requireManagerSession(request: Request, set: ResponseSet) {
  const currentSession = await requireSession(request, set);
  if (!currentSession) {
    return null;
  }

  const access = getAccessForEmail(currentSession.user.email);
  if (!access.canManage) {
    set.status = 403;
    return null;
  }

  return { currentSession, access };
}

async function buildCartResponse(userId: string): Promise<CartResponseItem[]> {
  const rows = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.updatedAt));

  if (rows.length === 0) {
    return [];
  }

  const menuIds = rows.map((row) => row.menuItemId);
  const items = await db.select().from(menuItems).where(inArray(menuItems.id, menuIds));
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return rows
    .map((row) => {
      const item = itemMap.get(row.menuItemId);
      if (!item) {
        return null;
      }

      return {
        cartItemId: row.id,
        menuItemId: row.menuItemId,
        qty: row.qty,
        item,
      };
    })
    .filter((row): row is CartResponseItem => Boolean(row));
}

async function upsertCartItem(userId: string, menuItemId: number, qty: number) {
  const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, menuItemId));
  if (!menuItem || !menuItem.isActive) {
    throw new Error('該菜單項目不存在或已下架');
  }

  const [existingCartItem] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.menuItemId, menuItemId)));

  if (existingCartItem) {
    await db
      .update(cartItems)
      .set({
        qty,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, existingCartItem.id));
  } else {
    await db.insert(cartItems).values({
      userId,
      menuItemId,
      qty,
      updatedAt: new Date(),
    });
  }

  return buildCartResponse(userId);
}

const app = new Elysia()
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  .use(swagger({ path: '/docs' }))
  .all('/api/auth', ({ request }) => auth.handler(request))
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .get('/health', () => ({
    status: 'ok',
    message: 'Speedy Breakfast backend is running.',
  }))
  .get('/api/auth/access', async ({ request, set }) => {
    const currentSession = await requireSession(request, set);
    if (!currentSession) {
      return { message: '未登入', data: null };
    }

    return {
      message: '取得登入權限成功',
      data: {
        user: currentSession.user,
        ...getAccessForEmail(currentSession.user.email),
      },
    };
  })
  .ws('/ws/kitchen', {
    open(ws) {
      ws.subscribe('kitchen_alerts');
      ws.send(JSON.stringify({ type: 'SYSTEM', message: '已連接 KDS 廣播頻道' }));
    },
  })
  .ws('/ws/orders', {
    open(ws) {
      ws.subscribe('order_updates');
      ws.send(JSON.stringify({ type: 'SYSTEM', message: '已連接訂單狀態頻道' }));
    },
  })
  .get('/api/menu', async () => {
    const menu = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isActive, true))
      .orderBy(menuItems.category, menuItems.id);

    return { message: '取得菜單成功', data: menu };
  })
  .get('/api/cart', async ({ request, set }) => {
    const currentSession = await requireSession(request, set);
    if (!currentSession) {
      return { message: '未登入', data: [] };
    }

    return {
      message: '取得購物車成功',
      data: await buildCartResponse(currentSession.user.id),
    };
  })
  .post(
    '/api/cart/items',
    async ({ request, set, body }) => {
      const currentSession = await requireSession(request, set);
      if (!currentSession) {
        return { message: '未登入', data: [] };
      }

      try {
        const currentCart = await buildCartResponse(currentSession.user.id);
        const existing = currentCart.find((item) => item.menuItemId === body.menuItemId);
        const nextQty = (existing?.qty ?? 0) + Math.max(1, body.qty ?? 1);
        const data = await upsertCartItem(currentSession.user.id, body.menuItemId, nextQty);
        return { message: '已加入購物車', data };
      } catch (error) {
        set.status = 400;
        return {
          message: error instanceof Error ? error.message : '加入購物車失敗',
          data: [],
        };
      }
    },
    {
      body: t.Object({
        menuItemId: t.Number(),
        qty: t.Optional(t.Number()),
      }),
    },
  )
  .put(
    '/api/cart/items/:menuItemId',
    async ({ request, set, params, body }) => {
      const currentSession = await requireSession(request, set);
      if (!currentSession) {
        return { message: '未登入', data: [] };
      }

      const menuItemId = Number(params.menuItemId);
      if (!Number.isFinite(menuItemId)) {
        set.status = 400;
        return { message: 'menuItemId 格式錯誤', data: [] };
      }

      if (body.qty <= 0) {
        await db
          .delete(cartItems)
          .where(and(eq(cartItems.userId, currentSession.user.id), eq(cartItems.menuItemId, menuItemId)));
        return {
          message: '已從購物車移除',
          data: await buildCartResponse(currentSession.user.id),
        };
      }

      try {
        const data = await upsertCartItem(currentSession.user.id, menuItemId, body.qty);
        return { message: '已更新購物車數量', data };
      } catch (error) {
        set.status = 400;
        return {
          message: error instanceof Error ? error.message : '更新購物車失敗',
          data: [],
        };
      }
    },
    {
      body: t.Object({
        qty: t.Number(),
      }),
    },
  )
  .delete('/api/cart/items/:menuItemId', async ({ request, set, params }) => {
    const currentSession = await requireSession(request, set);
    if (!currentSession) {
      return { message: '未登入', data: [] };
    }

    const menuItemId = Number(params.menuItemId);
    if (!Number.isFinite(menuItemId)) {
      set.status = 400;
      return { message: 'menuItemId 格式錯誤', data: [] };
    }

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, currentSession.user.id), eq(cartItems.menuItemId, menuItemId)));

    return {
      message: '已刪除購物車項目',
      data: await buildCartResponse(currentSession.user.id),
    };
  })
  .post(
    '/api/orders',
    async ({ request, set, body, server }) => {
      const currentSession = await requireSession(request, set);
      if (!currentSession) {
        return { message: '未登入', orderId: null };
      }

      if (body.items.length === 0) {
        set.status = 400;
        return { message: '購物車沒有任何商品', orderId: null };
      }

      const itemIds = body.items.map((item) => item.menuItemId);
      const menuData = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));
      const menuMap = new Map(menuData.map((item) => [item.id, item]));

      let calculatedTotal = 0;
      const validItems = body.items.map((item) => {
        const dbItem = menuMap.get(item.menuItemId);
        if (!dbItem || !dbItem.isActive) {
          throw new Error(`餐點 ${item.menuItemId} 不存在或已下架`);
        }
        calculatedTotal += dbItem.price * item.qty;
        return { item, dbItem };
      });

      const [newOrder] = await db
        .insert(orders)
        .values({
          userId: currentSession.user.id,
          total: calculatedTotal,
          status: 'submitted',
          submittedAt: new Date(),
        })
        .returning();

      if (!newOrder) {
        throw new Error('建立訂單失敗');
      }

      await Promise.all(
        validItems.map(({ item, dbItem }) =>
          db.insert(orderItems).values({
            orderId: newOrder.id,
            menuItemId: item.menuItemId,
            qty: item.qty,
            snapshotItem: {
              name: dbItem.name,
              price: dbItem.price,
              imageUrl: dbItem.imageUrl,
              category: dbItem.category,
            } satisfies SnapshotItem,
          }),
        ),
      );

      await db.delete(cartItems).where(eq(cartItems.userId, currentSession.user.id));

      server?.publish(
        'kitchen_alerts',
        JSON.stringify({
          type: 'NEW_ORDER',
          orderId: newOrder.id,
          message: `新訂單 #${newOrder.id} 已送出，總額 $${calculatedTotal}`,
        }),
      );

      return {
        message: '訂單已送出',
        orderId: newOrder.id,
        total: calculatedTotal,
      };
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            menuItemId: t.Number(),
            qty: t.Number(),
          }),
        ),
      }),
    },
  )
  .get('/api/orders/history', async ({ request, set }) => {
    const currentSession = await requireSession(request, set);
    if (!currentSession) {
      return { message: '未登入', data: [] };
    }

    const history = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, currentSession.user.id))
      .orderBy(desc(orders.createdAt));

    return {
      message: '取得歷史訂單成功',
      data: history,
    };
  })
  .get('/api/kitchen/orders/active', async ({ request, set }) => {
    const accessSession = await requireStaffSession(request, set);
    if (!accessSession) {
      return { message: '沒有權限', data: [] };
    }

    const activeOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, ['submitted', 'PREPARING']))
      .orderBy(desc(orders.createdAt));

    const activeOrderIds = activeOrders.map((order) => order.id);
    const activeOrderItems =
      activeOrderIds.length > 0
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, activeOrderIds))
            .orderBy(orderItems.id)
        : [];

    const itemsByOrderId = activeOrderItems.reduce<Map<number, ActiveKitchenOrder['items']>>(
      (acc, item) => {
        const currentItems = acc.get(item.orderId) ?? [];
        currentItems.push({
          id: item.id,
          qty: item.qty,
          snapshotItem: item.snapshotItem as SnapshotItem,
        });
        acc.set(item.orderId, currentItems);
        return acc;
      },
      new Map(),
    );

    const kitchenOrders: ActiveKitchenOrder[] = activeOrders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) ?? [],
    }));

    return {
      message: '取得 KDS 訂單成功',
      data: kitchenOrders,
    };
  })
  .put(
    '/api/kitchen/orders/:id/status',
    async ({ request, set, params, body, server }) => {
      const accessSession = await requireStaffSession(request, set);
      if (!accessSession) {
        return { message: '沒有權限' };
      }

      const orderId = Number(params.id);
      if (!Number.isFinite(orderId)) {
        set.status = 400;
        return { message: '訂單 ID 格式錯誤' };
      }

      await db.update(orders).set({ status: body.status }).where(eq(orders.id, orderId));

      const alertMessage =
        body.status === 'PREPARING'
          ? `你的訂單 #${orderId} 已進入製作中。`
          : `你的訂單 #${orderId} 已完成，請準備取餐。`;

      server?.publish(
        'order_updates',
        JSON.stringify({
          type: 'ORDER_STATUS_UPDATED',
          orderId,
          status: body.status,
          message: alertMessage,
        }),
      );

      return { message: `訂單 ${orderId} 狀態已更新` };
    },
    {
      body: t.Object({
        status: t.Union([t.Literal('PREPARING'), t.Literal('COMPLETED')]),
      }),
    },
  )
  .get('/api/admin/revenue', async ({ request, set }) => {
    const accessSession = await requireManagerSession(request, set);
    if (!accessSession) {
      return { message: '沒有權限', data: null };
    }

    const { start, end, date } = getReportDateRange(new URL(request.url).searchParams.get('date'));

    const dailyOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
      .orderBy(desc(orders.createdAt));

    const totalRevenue = dailyOrders.reduce((sum, order) => sum + order.total, 0);
    const statusBreakdown = dailyOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});

    const orderIds = dailyOrders.map((order) => order.id);
    const dailyOrderItems =
      orderIds.length > 0
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
            .orderBy(orderItems.id)
        : [];

    const dailyMenuIds = [...new Set(dailyOrderItems.map((item) => item.menuItemId))];
    const dailyMenuItems =
      dailyMenuIds.length > 0
        ? await db.select().from(menuItems).where(inArray(menuItems.id, dailyMenuIds))
        : [];
    const menuCategoryById = new Map(dailyMenuItems.map((item) => [item.id, item.category]));

    const itemStats = new Map<
      string,
      { name: string; category: MenuCategory; qty: number; revenue: number; imageUrl?: string | null }
    >();
    const categoryStats = new Map<
      MenuCategory,
      {
        category: MenuCategory;
        totalQty: number;
        totalRevenue: number;
        items: Array<{ name: string; qty: number; revenue: number; imageUrl?: string | null }>;
      }
    >(
      menuCategories.map((category) => [
        category,
        {
          category,
          totalQty: 0,
          totalRevenue: 0,
          items: [],
        },
      ]),
    );
    const itemsByOrderId = new Map<number, AdminOrderHistoryItem[]>();

    for (const row of dailyOrderItems) {
      const snapshot = row.snapshotItem as SnapshotItem;
      const name = snapshot.name ?? `餐點 ${row.menuItemId}`;
      const price = snapshot.price ?? 0;
      const category = normalizeSalesCategory(menuCategoryById.get(row.menuItemId) ?? snapshot.category);
      const revenue = price * row.qty;
      const itemKey = `${category}:${name}`;

      const current = itemStats.get(itemKey);
      if (current) {
        current.qty += row.qty;
        current.revenue += revenue;
      } else {
        itemStats.set(itemKey, {
          name,
          category,
          qty: row.qty,
          revenue,
          imageUrl: snapshot.imageUrl,
        });
      }

      const categoryStat = categoryStats.get(category);
      if (categoryStat) {
        categoryStat.totalQty += row.qty;
        categoryStat.totalRevenue += revenue;
      }

      const currentOrderItems = itemsByOrderId.get(row.orderId) ?? [];
      currentOrderItems.push({
        id: row.id,
        qty: row.qty,
        snapshotItem: {
          ...snapshot,
          category,
        },
      });
      itemsByOrderId.set(row.orderId, currentOrderItems);
    }

    const topItems = [...itemStats.values()]
      .sort((left, right) => right.qty - left.qty || right.revenue - left.revenue)
      .slice(0, 5);

    for (const item of itemStats.values()) {
      const categoryStat = categoryStats.get(item.category);
      categoryStat?.items.push({
        name: item.name,
        qty: item.qty,
        revenue: item.revenue,
        imageUrl: item.imageUrl,
      });
    }

    const categorySales = [...categoryStats.values()].map((category) => ({
      ...category,
      items: category.items.sort((left, right) => right.qty - left.qty || right.revenue - left.revenue),
    }));

    const adminOrders: AdminOrderHistoryRecord[] = dailyOrders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) ?? [],
    }));

    return {
      message: '取得單日營業額成功',
      data: {
        date,
        totalRevenue,
        orderCount: dailyOrders.length,
        averageOrderValue: dailyOrders.length === 0 ? 0 : Math.round(totalRevenue / dailyOrders.length),
        statusBreakdown,
        topItems,
        categorySales,
        orders: adminOrders,
      },
    };
  })
  .get('/api/admin/revenue/history', async ({ request, set }) => {
    const accessSession = await requireManagerSession(request, set);
    if (!accessSession) {
      return { message: '瘝?甈?', data: [] };
    }

    const days = clampHistoryDays(new URL(request.url).searchParams.get('days'));
    const { start, end } = getHistoryDateRange(days);

    const periodOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
      .orderBy(desc(orders.createdAt));

    const dailyReports = new Map<
      string,
      {
        date: string;
        totalRevenue: number;
        orderCount: number;
        averageOrderValue: number;
        statusBreakdown: Record<string, number>;
      }
    >();

    for (let index = 0; index < days; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = formatReportDate(date);
      dailyReports.set(key, {
        date: key,
        totalRevenue: 0,
        orderCount: 0,
        averageOrderValue: 0,
        statusBreakdown: {},
      });
    }

    for (const order of periodOrders) {
      const key = formatReportDate(order.createdAt);
      const report = dailyReports.get(key);
      if (!report) {
        continue;
      }
      report.totalRevenue += order.total;
      report.orderCount += 1;
      report.statusBreakdown[order.status] = (report.statusBreakdown[order.status] ?? 0) + 1;
    }

    const history = [...dailyReports.values()].map((report) => ({
      ...report,
      averageOrderValue:
        report.orderCount === 0 ? 0 : Math.round(report.totalRevenue / report.orderCount),
    }));

    return {
      message: '取得歷史營收成功',
      data: history,
    };
  })
  .get('/api/admin/orders/history', async ({ request, set }) => {
    const accessSession = await requireManagerSession(request, set);
    if (!accessSession) {
      return { message: '瘝?甈?', data: [] };
    }

    const days = clampHistoryDays(new URL(request.url).searchParams.get('days'));
    const { start, end } = getHistoryDateRange(days);

    const historyOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
      .orderBy(desc(orders.createdAt));

    const orderIds = historyOrders.map((order) => order.id);
    const historyItems =
      orderIds.length > 0
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
            .orderBy(orderItems.id)
        : [];

    const itemsByOrderId = historyItems.reduce<Map<number, AdminOrderHistoryItem[]>>(
      (acc, item) => {
        const currentItems = acc.get(item.orderId) ?? [];
        currentItems.push({
          id: item.id,
          qty: item.qty,
          snapshotItem: item.snapshotItem as SnapshotItem,
        });
        acc.set(item.orderId, currentItems);
        return acc;
      },
      new Map(),
    );

    const adminOrders: AdminOrderHistoryRecord[] = historyOrders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) ?? [],
    }));

    return {
      message: '取得歷史訂單成功',
      data: adminOrders,
    };
  })
  .get('/api/admin/menu', async ({ request, set }) => {
    const accessSession = await requireManagerSession(request, set);
    if (!accessSession) {
      return { message: '沒有權限', data: [] };
    }

    const menu = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.id);
    return { message: '取得完整菜單成功', data: menu };
  })
  .post(
    '/api/admin/menu',
    async ({ request, set, body }) => {
      const accessSession = await requireManagerSession(request, set);
      if (!accessSession) {
        return { message: '沒有權限', data: null };
      }

      const category = body.category.trim();
      if (!isMenuCategory(category)) {
        set.status = 400;
        return { message: '分類只能是麵食、中式餐點、西式餐點或飲品', data: null };
      }
      const [created] = await db
        .insert(menuItems)
        .values({
          name: body.name.trim(),
          price: body.price,
          category,
          description: normalizeOptionalText(body.description),
          imageUrl: normalizeOptionalText(body.imageUrl),
          isActive: body.isActive,
          updatedAt: new Date(),
        })
        .returning();

      return { message: '新增菜單成功', data: created ?? null };
    },
    {
      body: t.Object({
        name: t.String(),
        price: t.Number(),
        category: t.String(),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        isActive: t.Boolean(),
      }),
    },
  )
  .put(
    '/api/admin/menu/:id',
    async ({ request, set, params, body }) => {
      const accessSession = await requireManagerSession(request, set);
      if (!accessSession) {
        return { message: '沒有權限', data: null };
      }

      const menuItemId = Number(params.id);
      if (!Number.isFinite(menuItemId)) {
        set.status = 400;
        return { message: '菜單 ID 格式錯誤', data: null };
      }

      const category = body.category.trim();
      if (!isMenuCategory(category)) {
        set.status = 400;
        return { message: '分類只能是麵食、中式餐點、西式餐點或飲品', data: null };
      }
      const [updated] = await db
        .update(menuItems)
        .set({
          name: body.name.trim(),
          price: body.price,
          category,
          description: normalizeOptionalText(body.description),
          imageUrl: normalizeOptionalText(body.imageUrl),
          isActive: body.isActive,
          updatedAt: new Date(),
        })
        .where(eq(menuItems.id, menuItemId))
        .returning();

      return { message: '更新菜單成功', data: updated ?? null };
    },
    {
      body: t.Object({
        name: t.String(),
        price: t.Number(),
        category: t.String(),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        isActive: t.Boolean(),
      }),
    },
  )
// 使用 Render 自動分配的 PORT (通常是 10000)，並強制綁定在 0.0.0.0
  .listen({
    port: process.env.PORT || 3000,
    hostname: '0.0.0.0' // 允許雲端外部連線
  }, (server) => {
    console.log(`Elysia 伺服器已啟動於 http://${server.hostname}:${server.port}`);
    console.log(`API 文件請瀏覽 http://localhost:${server.port}/docs`);
  });








