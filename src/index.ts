import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
// 新增引入 eq, inArray 來做資料庫查詢
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from './db';
import { menuItems, orders, orderItems } from './db/schema';

const app = new Elysia()
  .use(cors())
  .use(swagger({ path: '/docs' }))

  .get('/health', () => ({ status: 'ok', message: '極速晨食引擎運轉中 🏎️💨' }))

  // ==========================================
  // ⚡ 即時通訊模組 (WebSockets)
  // ==========================================
  
  .ws('/ws/kitchen', {
    open(ws) {
      ws.subscribe('kitchen_alerts');
      console.log('👨‍🍳 廚房終端已連線並準備接收警報');
      ws.send(JSON.stringify({ type: 'SYSTEM', message: '已連接廚房廣播頻道' }));
    }
  })

  // 👇 升級：讓車手訂閱訂單進度頻道
  .ws('/ws/orders', {
    open(ws) {
      ws.subscribe('order_updates');
      console.log('🏎️ 車手已連線追蹤訂單');
      ws.send(JSON.stringify({ type: 'SYSTEM', message: '已連接車手追蹤雷達' }));
    }
  })

  // ==========================================
  // 🏁 顧客端模組 (Customer APIs)
  // ==========================================
  
  // 3. 建立訂單 (極速下單邏輯)
  .post('/api/orders', async ({ body, server }) => {
    console.log('📥 收到新訂單請求:', body);
    // ==========================================
    // 💡 修正 1：從資料庫撈出真實商品資訊，計算總額
    // ==========================================
    const itemIds = body.items.map(item => item.menuItemId);
    
    // 一次從資料庫撈出這筆訂單內所有餐點的真實資料
    const menuData = await db.select().from(menuItems)
      .where(inArray(menuItems.id, itemIds));

    let calculatedTotal = 0;
    
    // 核對每一項商品，並計算 (真實單價 * 數量)
    const validItems = body.items.map(item => {
      const dbItem = menuData.find(m => m.id === item.menuItemId);
      if (!dbItem) throw new Error(`找不到餐點 ID: ${item.menuItemId}`);
      
      calculatedTotal += dbItem.price * item.qty;
      
      return {
        qty: item.qty,
        menuItemId: item.menuItemId,
        dbItem // 把真實商品資料綁在一起，等一下存快照用
      };
    });

    // ==========================================
    // 💡 修正 2：寫入算出來的真實總額 (calculatedTotal)
    // ==========================================
    const [newOrder] = await db.insert(orders).values({
      userId: body.userId,
      total: calculatedTotal, // <--- 這裡改為系統計算的精準總額
      status: 'submitted',
      submittedAt: new Date(),
    }).returning();

    if (!newOrder) {
      throw new Error('資料庫無法建立訂單');
    }

    // ==========================================
    // 💡 修正 3：保留下單當下的價格快照
    // ==========================================
    await Promise.all(validItems.map(item => 
      db.insert(orderItems).values({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        qty: item.qty,
        // 依照規格書要求：記錄下單當下的價格快照，避免未來漲價影響歷史訂單
        snapshotItem: { 
          name: item.dbItem.name, 
          price: item.dbItem.price 
        } 
      })
    ));

    // 4. 🚨 觸發 WebSocket 廣播
    server?.publish('kitchen_alerts', JSON.stringify({
      type: 'NEW_ORDER',
      orderId: newOrder.id,
      message: `🏎️ 新訂單 #${newOrder.id} 已進站，總計 $${calculatedTotal}，請立即準備補給！`
    }));

    return { 
      message: '訂單已極速送出', 
      orderId: newOrder.id,
      total: calculatedTotal // 回傳正確總額給前端
    };
  }, {
    body: t.Object({
      userId: t.String(),
      items: t.Array(t.Object({
        menuItemId: t.Number(),
        qty: t.Number()
      }))
    })
  })

  .get('/api/orders/:id', ({ params: { id } }) => {
    return { message: `查詢訂單 ${id} 詳情` };
  })

  // 5. 顧客歷史訂單 (戰績回顧)
  .get('/api/orders/history', async ({ query }) => {
    // 💡 實戰小提示：這裡目前先用 query 傳入 userId，
    // 未來掛上 Better Auth 後，會改成從 HttpOnly Cookie 取出 Session 解析！
    const userId = query.userId || 'racer_001'; 
    
    // 從資料庫撈出該使用者的訂單，並用時間倒序排列 (最新的在最上面)
    const history = await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return { message: '取得顧客歷史訂單', data: history };
  })

  // ==========================================
  // 🛠️ 廚房端模組 (Kitchen APIs)
  // ==========================================

  // 👇 升級：從資料庫撈取未完成的訂單 (剛送出或製作中)
  .get('/api/kitchen/orders/active', async () => {
    const activeOrders = await db.select().from(orders)
      .where(inArray(orders.status, ['submitted', 'PREPARING']));
    return { message: '取得待處理與製作中訂單', data: activeOrders };
  })

  // 👇 升級：更新資料庫狀態，並推播給車手
  .put('/api/kitchen/orders/:id/status', async ({ params: { id }, body, server }) => {
    const orderId = parseInt(id);

    // 1. 更新資料庫
    await db.update(orders)
      .set({ status: body.status })
      .where(eq(orders.id, orderId));

    // 2. 廣播給車手 (顧客)
    const alertMessage = body.status === 'PREPARING' 
      ? `🔥 你的訂單 #${orderId} 正在注入氮氣 (製作中)！`
      : `🏁 你的訂單 #${orderId} 已抵達終點 (請取餐)！`;

    server?.publish('order_updates', JSON.stringify({
      type: 'ORDER_STATUS_UPDATED',
      orderId: orderId,
      status: body.status,
      message: alertMessage
    }));

    return { message: `訂單 ${orderId} 狀態已更新為 ${body.status}` };
  }, {
    body: t.Object({
      status: t.Union([t.Literal('PREPARING'), t.Literal('COMPLETED')])
    })
  })

  // ==========================================
  // 👑 管理後台模組 (Admin APIs)
  // ==========================================
  .get('/api/admin/revenue', () => {
    return { message: '取得今日營業額與熱銷排行榜' };
  })

  .listen(3000);

console.log(`🦊 Elysia 伺服器已啟動於 http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📖 API 文件請瀏覽 http://${app.server?.hostname}:${app.server?.port}/docs`);