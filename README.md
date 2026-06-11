# 早餐店點餐系統

一個前後端分離的早餐店點餐系統，提供顧客點餐、購物車、訂單追蹤、廚房 KDS 與老闆後台管理功能。專案採用 React + Vite 建立前端，Elysia + Better Auth 建立後端，資料儲存使用 PostgreSQL 與 Drizzle ORM，並支援 Render 雲端部署。

## 專案功能

- 顧客端：瀏覽菜單、加入購物車、送出訂單、查看歷史訂單
- 廚房端：即時查看待處理訂單、更新製作狀態
- 管理端：查看每日營收、熱銷商品、維護菜單上下架
- 登入驗證：Google OAuth 登入
- 即時通知：透過 WebSocket 推送訂單狀態與 KDS 廣播

## 技術棧

### 前端

- `React 19`
- `TypeScript`
- `Vite`
- `Tailwind CSS 3`
- `lucide-react`
- `better-auth/react`

### 後端

- `Bun`
- `TypeScript`
- `Elysia`
- `@elysiajs/cors`
- `@elysiajs/swagger`
- `better-auth`
- `drizzle-orm`
- `@neondatabase/serverless`
- `dotenv`

### 資料庫與部署

- `PostgreSQL`
- `Neon`
- `Render`

## 套件分析

### 前端主要套件

- `react`、`react-dom`：建立 SPA 介面
- `better-auth`：前端 session 狀態與社群登入流程
- `lucide-react`：介面圖示
- `vite`：前端建置與開發伺服器
- `tailwindcss`、`postcss`、`autoprefixer`：樣式系統
- `eslint`、`typescript-eslint`：程式品質檢查

### 後端主要套件

- `elysia`：建立 HTTP API 與 WebSocket 路由
- `@elysiajs/cors`：處理跨網域請求
- `@elysiajs/swagger`：產生 API 文件頁
- `better-auth`：Google OAuth、session、帳號系統
- `drizzle-orm`：資料存取與 schema 定義
- `drizzle-kit`：資料庫 migration 工具
- `@neondatabase/serverless`：連接 Neon PostgreSQL
- `dotenv`：讀取環境變數
- `tsx`：TypeScript 執行輔助工具

## 系統架構

- `frontend/`：React 前端專案
- `src/index.ts`：Elysia API 與 WebSocket 入口
- `src/auth.ts`：Better Auth 設定
- `src/runtime.ts`：環境變數與 origin 設定整理
- `src/db/schema.ts`：資料表 schema
- `src/db/index.ts`：Drizzle + Neon 連線設定

## 資料表

目前 schema 共 8 張資料表。

- 業務資料表 4 張：`menu_items`、`orders`、`order_items`、`cart_items`
- 認證資料表 3 張：`user`、`session`、`account`
- 驗證資料表 1 張：`verification`

如果以功能分類來看，可視為：

- 點餐核心資料：`menu_items`、`orders`、`order_items`、`cart_items`
- Better Auth 自動管理：`user`、`session`、`account`、`verification`

## API 概覽

### 自訂 HTTP API

目前後端自訂了 15 個 HTTP API。

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/health` | 健康檢查 |
| `GET` | `/api/auth/access` | 取得目前登入者角色與權限 |
| `GET` | `/api/menu` | 取得可販售菜單 |
| `GET` | `/api/cart` | 取得購物車 |
| `POST` | `/api/cart/items` | 加入購物車項目 |
| `PUT` | `/api/cart/items/:menuItemId` | 更新購物車數量 |
| `DELETE` | `/api/cart/items/:menuItemId` | 刪除購物車項目 |
| `POST` | `/api/orders` | 建立訂單 |
| `GET` | `/api/orders/history` | 取得歷史訂單 |
| `GET` | `/api/kitchen/orders/active` | 取得廚房待處理訂單 |
| `PUT` | `/api/kitchen/orders/:id/status` | 更新訂單狀態 |
| `GET` | `/api/admin/revenue` | 取得每日營收報表 |
| `GET` | `/api/admin/menu` | 取得完整菜單 |
| `POST` | `/api/admin/menu` | 新增菜單 |
| `PUT` | `/api/admin/menu/:id` | 編輯菜單 |

### WebSocket API

目前有 2 個 WebSocket 頻道。

- `/ws/orders`：推送顧客訂單狀態更新
- `/ws/kitchen`：推送廚房新訂單廣播

### Better Auth 路由

除了上述自訂 API，系統還透過 Better Auth 提供一組認證相關路由，掛載在：

- `/api/auth`
- `/api/auth/*`

這些路由包含：

- 取得 session
- Google 社群登入
- 登出
- OAuth callback

## 角色權限

- `customer`：一般顧客，可瀏覽菜單、購物車、送單、查歷史訂單
- `staff`：廚房人員，可使用 KDS
- `manager`：管理者，可使用 KDS 與後台管理功能

角色判斷依據：

- `STAFF_EMAILS`
- `MANAGER_EMAILS`

## 開發環境需求

- `Bun`
- `Node.js`：前端 Vite 建議安裝
- `PostgreSQL` 或 `Neon`
- `Google OAuth Client`

## 安裝與啟動

### 1. 安裝後端依賴

```bash
bun install
```

### 2. 安裝前端依賴

```bash
cd frontend
npm install
```

### 3. 設定環境變數

後端 `.env`

```env
DATABASE_URL=
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
API_ALLOWED_ORIGIN=http://localhost:5173
TRUSTED_ORIGINS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
STAFF_EMAILS=
MANAGER_EMAILS=
```

前端 `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 4. 啟動後端

```bash
bun run src/index.ts
```

或使用監看模式：

```bash
bun --watch src/index.ts
```

### 5. 啟動前端

```bash
cd frontend
npm run dev
```

## 部署重點

### Render 前端環境變數

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### Render 後端環境變數

```env
DATABASE_URL=
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

- `http://localhost:5173`
- `https://your-frontend.onrender.com`

Authorized redirect URIs：

- `http://localhost:3000/api/auth/callback/google`
- `https://your-backend.onrender.com/api/auth/callback/google`

## API 文件

後端啟動後可透過 Swagger 頁面查看文件：

```text
http://localhost:3000/docs
```

## 專案特色總結

- 前後端分離架構
- Google OAuth 登入
- 顧客 / 廚房 / 老闆三種角色介面
- 購物車與訂單流程完整
- WebSocket 即時更新
- 可部署於 Render
- 使用 PostgreSQL 持久化資料
