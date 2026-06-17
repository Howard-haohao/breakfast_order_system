# 早餐店點餐系統

這是一個前後端分離的早餐店點餐系統，包含顧客點餐、購物車、訂單狀態追蹤、廚房 KDS、店長後台、菜單管理與單日營收分析。前端使用 React + Vite，後端使用 Elysia + Bun，登入使用 Better Auth + Google OAuth，資料庫使用 Neon PostgreSQL + Drizzle ORM。

## 功能總覽

- 顧客端：瀏覽菜單、加入購物車、送出訂單、查看歷史訂單。
- 廚房端：KDS 工作台可查看待處理訂單、餐點品項與製作時間，並更新訂單狀態。
- 店長後台：查看單日營收、單日訂單數、平均客單價、熱銷排行榜、分類商品銷售紀錄與當日訂單明細。
- 菜單管理：新增、編輯、上下架商品，商品分類固定為 `麵食`、`中式餐點`、`西式餐點`、`飲品`。
- 權限控管：透過 `STAFF_EMAILS` 與 `MANAGER_EMAILS` 控制 KDS 與店長後台權限。
- 即時通知：透過 WebSocket 推送新訂單與訂單狀態更新。

## 技術架構

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 3
- lucide-react
- better-auth/react

### Backend

- Bun
- TypeScript
- Elysia
- Better Auth
- Drizzle ORM
- Neon PostgreSQL
- @neondatabase/serverless
- dotenv

## 專案結構

```text
.
├── frontend/                    # React 前端
│   ├── src/App.tsx              # 主要畫面：顧客、KDS、店長後台
│   └── package.json             # 前端 scripts 與依賴
├── src/
│   ├── index.ts                 # Elysia API 與 WebSocket
│   ├── auth.ts                  # Better Auth 設定
│   ├── runtime.ts               # 環境變數與 origin 設定
│   └── db/
│       ├── index.ts             # Drizzle + Neon 連線
│       ├── schema.ts            # 資料表 schema
│       └── seed.ts              # 範例資料重置腳本
├── drizzle/                     # SQL migration 檔案
├── scripts/                     # 維護與資料修復腳本
├── drizzle.config.ts            # Drizzle Kit 設定
└── package.json                 # 後端依賴
```

## 資料表

主要業務資料表：

- `menu_items`：菜單商品資料，包含名稱、價格、分類、描述、圖片網址、上下架狀態。
- `cart_items`：顧客購物車內容。
- `orders`：訂單主檔，包含使用者、總金額、狀態與建立時間。
- `order_items`：訂單明細，包含商品數量與下單當下的商品快照。

Better Auth 資料表：

- `user`
- `session`
- `account`
- `verification`

## 商品分類

目前系統固定使用四種商品分類：

- `麵食`
- `中式餐點`
- `西式餐點`
- `飲品`

店長後台的菜單新增與編輯會使用下拉選單限制分類；後端 API 也會驗證分類，資料庫 migration 會補上 `menu_items_category_check` constraint。

## API 總覽

### Public / Auth

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/health` | 後端健康檢查 |
| `GET` | `/api/auth/access` | 取得目前登入者角色與權限 |
| `GET` | `/api/menu` | 取得顧客可購買菜單 |
| `ALL` | `/api/auth`、`/api/auth/*` | Better Auth 相關路由 |

### Cart / Orders

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/api/cart` | 取得目前使用者購物車 |
| `POST` | `/api/cart/items` | 加入購物車或增加數量 |
| `PUT` | `/api/cart/items/:menuItemId` | 更新購物車商品數量 |
| `DELETE` | `/api/cart/items/:menuItemId` | 移除購物車商品 |
| `POST` | `/api/orders` | 建立訂單 |
| `GET` | `/api/orders/history` | 取得顧客歷史訂單 |

### Kitchen KDS

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/api/kitchen/orders/active` | 取得待處理與製作中訂單 |
| `PUT` | `/api/kitchen/orders/:id/status` | 更新訂單狀態 |

### Manager Admin

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/api/admin/revenue?date=YYYY-MM-DD` | 取得指定日期的營收、分類商品銷售與訂單明細 |
| `GET` | `/api/admin/menu` | 取得完整菜單 |
| `POST` | `/api/admin/menu` | 新增菜單商品 |
| `PUT` | `/api/admin/menu/:id` | 編輯菜單商品或上下架 |

### WebSocket

| Path | 說明 |
| --- | --- |
| `/ws/orders` | 推送顧客訂單狀態更新 |
| `/ws/kitchen` | 推送 KDS 新訂單通知 |

## 權限設定

權限透過環境變數中的 email 白名單控制：

- `STAFF_EMAILS`：可使用 KDS。
- `MANAGER_EMAILS`：可使用 KDS 與店長後台。

多個 email 使用逗號分隔：

```env
STAFF_EMAILS=staff@example.com,kitchen@example.com
MANAGER_EMAILS=owner@example.com
```

## 環境需求

- Bun
- Node.js / npm
- Neon PostgreSQL 或相容 PostgreSQL
- Google OAuth Client

## 安裝

後端依賴：

```powershell
cd <project-root>
bun install
```

前端依賴：

```powershell
cd <project-root>/frontend
npm install
```

## 環境變數

後端 `.env`：

```env
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
API_ALLOWED_ORIGIN=http://localhost:5173
TRUSTED_ORIGINS=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
STAFF_EMAILS=staff@example.com
MANAGER_EMAILS=manager@example.com
```

前端 `frontend/.env`：

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 資料庫設定

### 套用商品分類 constraint

目前專案的 `drizzle/` 目錄沒有 Drizzle Kit 的 `meta/_journal.json`，因此不要用 `npx drizzle-kit migrate` 套這次分類修正。請使用專案提供的 Neon HTTP 腳本：

```powershell
cd <project-root>
node scripts\apply_menu_category_constraints.js
```

也可以用 Bun 執行：

```powershell
bun scripts\apply_menu_category_constraints.js
```

這個腳本會：

- 將舊分類轉換成四種固定分類。
- 移除既有 `menu_items_category_check` constraint。
- 重新建立只允許四種分類的資料庫 constraint。
- 印出目前 `menu_items` 的分類數量。

### Seed 注意事項

`src/db/seed.ts` 會清空以下資料表後重建範例資料：

- `cart_items`
- `order_items`
- `orders`
- `menu_items`

不要在正式資料庫或有重要訂單資料的資料庫上執行 seed，否則歷史訂單與營收資料會被刪除。

如需重置本機測試資料：

```powershell
cd <project-root>
bun run src\db\seed.ts
```

## 本機開發

啟動後端：

```powershell
cd <project-root>
bun run src\index.ts
```

啟動前端：

```powershell
cd <project-root>/frontend
npm run dev
```

預設網址：

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/docs`

## 檢查與建置

後端 TypeScript 檢查：

```powershell
cd <project-root>
cmd /c .\node_modules\.bin\tsc
```

前端 TypeScript 檢查：

```powershell
cd <project-root>/frontend
cmd /c .\node_modules\.bin\tsc -b
```

前端正式 build：

```powershell
cd <project-root>/frontend
npm run build
```

## Render 部署設定

### 前端服務

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

前端環境變數：

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### 後端服務

- Runtime: Bun 或 Node/Bun 相容環境
- Start Command: `bun run src/index.ts`

後端環境變數：

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
API_ALLOWED_ORIGIN=https://your-frontend.onrender.com
TRUSTED_ORIGINS=https://your-frontend.onrender.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
STAFF_EMAILS=
MANAGER_EMAILS=
```

### Google OAuth 設定

Authorized JavaScript origins：

```text
http://localhost:5173
https://your-frontend.onrender.com
```

Authorized redirect URIs：

```text
http://localhost:3000/api/auth/callback/google
https://your-backend.onrender.com/api/auth/callback/google
```

## 常見問題

### 店長後台單日業績沒有資料

先確認該日期是否有訂單。若執行過 `bun run src/db/seed.ts`，`orders` 與 `order_items` 會被清空，歷史營收無法從目前資料庫還原。

### 商品分類全部跑到同一類

確認已執行：

```powershell
node scripts\apply_menu_category_constraints.js
```

並到店長後台檢查每個商品的分類是否已設定為四種固定分類之一。

### `drizzle-kit migrate` 顯示 Neon websocket warning

這個專案目前使用 Neon HTTP client 連線。分類 constraint 請用 `scripts/apply_menu_category_constraints.js`，不要用 `npx drizzle-kit migrate` 套這次手寫 SQL。