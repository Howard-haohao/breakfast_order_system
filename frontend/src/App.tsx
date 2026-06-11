import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Clock3,
  DollarSign,
  Flag,
  LayoutDashboard,
  ListOrdered,
  LoaderCircle,
  LogIn,
  LogOut,
  Minus,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Trash2,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { WS_BASE_URL, apiRequest } from './lib/api';
import { authClient } from './lib/authClient';
import OrderTimer from './components/OrderTimer';

type SessionData = ReturnType<typeof authClient.useSession>['data'];

type Portal = 'customer' | 'kitchen' | 'admin';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

type CartItem = {
  cartItemId: number;
  menuItemId: number;
  qty: number;
  item: MenuItem;
};

type HistoryOrder = {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  submittedAt: string | null;
};

type ActiveOrder = {
  id: number;
  userId: string;
  total: number;
  status: string;
  submittedAt: string | null;
  items: Array<{
    id: number;
    qty: number;
    snapshotItem: {
      name: string;
    };
  }>;
};

type OrderStatusState = {
  id: number | null;
  status: 'IDLE' | 'submitted' | 'PREPARING' | 'COMPLETED';
  message: string;
};

type AccessState = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  role: 'customer' | 'staff' | 'manager';
  canUseKitchen: boolean;
  canManage: boolean;
};

type RevenueReport = {
  date: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  statusBreakdown: Record<string, number>;
  topItems: Array<{
    name: string;
    qty: number;
    revenue: number;
    imageUrl?: string | null;
  }>;
};

type MenuFormState = {
  name: string;
  price: string;
  category: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

type AuthClientActions = {
  signIn: {
    social: (options: { provider: 'google'; callbackURL?: string }) => Promise<unknown>;
  };
  signOut: () => Promise<unknown>;
};

const authActions = authClient as typeof authClient & AuthClientActions;

const emptyMenuForm: MenuFormState = {
  name: '',
  price: '',
  category: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildStatusClass(status: OrderStatusState['status']) {
  if (status === 'PREPARING') {
    return 'border-orange-200 bg-orange-100 text-orange-700';
  }
  if (status === 'COMPLETED') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (status === 'submitted') {
    return 'border-sky-200 bg-sky-100 text-sky-700';
  }
  return 'border-slate-200 bg-white text-slate-500';
}

function getDefaultPortal(access: AccessState | null): Portal {
  if (!access) {
    return 'customer';
  }
  if (access.canManage) {
    return 'admin';
  }
  if (access.canUseKitchen) {
    return 'kitchen';
  }
  return 'customer';
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [portal, setPortal] = useState<Portal>('customer');
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');

  const displayName = session?.user.name ?? session?.user.email ?? '會員';

  const loadAccess = async () => {
    if (!session) {
      setAccess(null);
      setAccessError('');
      return;
    }

    setIsLoadingAccess(true);
    setAccessError('');

    try {
      const response = await apiRequest<{ message: string; data: AccessState }>('/api/auth/access');
      setAccess(response.data);
      setPortal((currentPortal) => {
        if (currentPortal === 'admin' && !response.data.canManage) {
          return getDefaultPortal(response.data);
        }
        if (currentPortal === 'kitchen' && !response.data.canUseKitchen) {
          return getDefaultPortal(response.data);
        }
        return currentPortal;
      });
    } catch (error) {
      setAccess(null);
      setAccessError(error instanceof Error ? error.message : '取得權限失敗');
    } finally {
      setIsLoadingAccess(false);
    }
  };

  useEffect(() => {
    if (!session) {
      setAccess(null);
      setPortal('customer');
      return;
    }

    void loadAccess();
  }, [session?.user.id]);

  useEffect(() => {
    if (!access) {
      return;
    }
    setPortal((currentPortal) => {
      if (currentPortal === 'admin' && !access.canManage) {
        return getDefaultPortal(access);
      }
      if (currentPortal === 'kitchen' && !access.canUseKitchen) {
        return getDefaultPortal(access);
      }
      return currentPortal;
    });
  }, [access]);

  const handleLogin = async () => {
    // 宣告 currentDomain 並抓取當下的網址
    const currentDomain = window.location.origin; 

    await authClient.signIn.social({
      provider: "google",
      callbackURL: currentDomain, // 成功時：回到當前網域
      errorCallbackURL: currentDomain // 失敗時：同樣強制留在當前網域
    });
  };

  const handleLogout = async () => {
    try {
      await authActions.signOut();
      setPortal('customer');
      setAccess(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : '登出失敗');
    }
  };

  const navigationItems: Array<{ key: Portal; label: string; icon: typeof ShoppingBasket }> = [
    { key: 'customer', label: '顧客點餐', icon: ShoppingBasket },
  ];

  if (access?.canUseKitchen) {
    navigationItems.push({ key: 'kitchen', label: 'KDS 工作台', icon: ChefHat });
  }

  if (access?.canManage) {
    navigationItems.push({ key: 'admin', label: '店長後台', icon: ShieldCheck });
  }

  if (isPending || (session && isLoadingAccess && !access)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe7] text-slate-700">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 shadow-sm">
          <LoaderCircle className="animate-spin text-orange-500" />
          <span className="font-medium">正在載入工作台...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffe8c7,_#f4efe7_45%,_#efe7dc_100%)] text-slate-800">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 px-6 py-12 lg:flex-row lg:items-center">
          <section className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
              <Flag size={16} />
              早餐店營運平台
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-6xl">
              先登入，再進入點餐、KDS 與店長管理後台。
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              顧客登入後才能開始點餐與保留購物車。店家帳號登入後，才會看到 KDS 工作台與店長專屬管理介面。
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  void handleLogin();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <LogIn size={18} />
                使用 Google 登入
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <Store size={16} />
                顧客與店家共用同一登入入口，權限由後端 email 白名單決定。
              </div>
            </div>
            {accessError ? <p className="text-sm font-medium text-red-600">{accessError}</p> : null}
          </section>

          <section className="grid gap-4 md:grid-cols-3 lg:w-[36rem] lg:grid-cols-1">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-orange-100">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ShoppingBasket />
              </div>
              <h2 className="text-xl font-bold">顧客點餐</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                登入後進入點餐介面，購物車會同步到資料庫，換裝置也能續點。
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-orange-100">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <ChefHat />
              </div>
              <h2 className="text-xl font-bold">KDS 工作台</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                店員專用看板，顯示待製作訂單並更新製作狀態。
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-orange-100">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <LayoutDashboard />
              </div>
              <h2 className="text-xl font-bold">店長後台</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                直接管理菜單圖片、價格、上架狀態，並查看每日營收與熱銷排行榜。
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const activeAccess = access ?? {
    user: {
      id: session.user.id,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      image: session.user.image,
    },
    role: 'customer' as const,
    canUseKitchen: false,
    canManage: false,
  };

  return (
    <div className="min-h-screen bg-[#f5f1ea] text-slate-800">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-950 px-6 py-8 text-white lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-900/30">
              <UtensilsCrossed />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Breakfast OS</p>
              <h1 className="text-xl font-black">極速晨食</h1>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img src={session.user.image} alt="avatar" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-200 text-lg font-bold text-slate-900">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayName}</p>
                <p className="truncate text-sm text-slate-400">{activeAccess.user.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-800 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              <span>Role</span>
              <span>{activeAccess.role}</span>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPortal(key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  portal === key
                    ? 'bg-white text-slate-900 shadow-lg shadow-slate-950/10'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 space-y-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">環境說明</p>
            <p>顧客只會看到點餐介面。</p>
            <p>店員白名單可使用 KDS。</p>
            <p>店長白名單可使用營運後台。</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                void loadAccess();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              <RefreshCw size={14} />
              重整權限
            </button>
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        </aside>

        <main className="px-4 py-6 md:px-8 lg:px-10">
          {accessError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {accessError}
            </div>
          ) : null}

          {portal === 'customer' ? (
            <CustomerView session={session} />
          ) : null}

          {portal === 'kitchen' && activeAccess.canUseKitchen ? <KitchenView /> : null}

          {portal === 'admin' && activeAccess.canManage ? <AdminView /> : null}
        </main>
      </div>
    </div>
  );
}

function CustomerView({ session }: { session: SessionData }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatusState>({
    id: null,
    status: 'IDLE',
    message: '尚未送出任何訂單',
  });

  const cartTotal = cart.reduce((sum, cartItem) => sum + cartItem.item.price * cartItem.qty, 0);
  const cartHasInactiveItems = cart.some((cartItem) => !cartItem.item.isActive);

  const loadMenu = async () => {
    const response = await apiRequest<{ message: string; data: MenuItem[] }>('/api/menu');
    setMenu(response.data);
  };

  const loadCart = async () => {
    const response = await apiRequest<{ message: string; data: CartItem[] }>('/api/cart');
    setCart(response.data);
  };

  const loadHistory = async () => {
    const response = await apiRequest<{ message: string; data: HistoryOrder[] }>('/api/orders/history');
    setHistoryOrders(response.data);
    setActiveTab('history');
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    let ignore = false;

    const loadInitialData = async () => {
      setIsLoading(true);
      setMessage('');

      try {
        const [menuResponse, cartResponse] = await Promise.all([
          apiRequest<{ message: string; data: MenuItem[] }>('/api/menu'),
          apiRequest<{ message: string; data: CartItem[] }>('/api/cart'),
        ]);

        if (!ignore) {
          setMenu(menuResponse.data);
          setCart(cartResponse.data);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : '載入資料失敗');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialData();

    const ws = new WebSocket(`${WS_BASE_URL}/ws/orders`);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        type?: string;
        orderId?: number;
        status?: OrderStatusState['status'];
        message?: string;
      };

      if (
        payload.type === 'ORDER_STATUS_UPDATED' &&
        payload.orderId &&
        payload.status &&
        payload.message
      ) {
        setOrderStatus({
          id: payload.orderId,
          status: payload.status,
          message: payload.message,
        });
      }
    };

    return () => {
      ignore = true;
      ws.close();
    };
  }, [session?.user.id]);

  const addToCart = async (menuItemId: number) => {
    try {
      const response = await apiRequest<{ message: string; data: CartItem[] }>('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ menuItemId, qty: 1 }),
      });
      setCart(response.data);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加入購物車失敗');
    }
  };

  const updateCartQuantity = async (menuItemId: number, qty: number) => {
    try {
      const response = await apiRequest<{ message: string; data: CartItem[] }>(
        `/api/cart/items/${menuItemId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ qty }),
        },
      );
      setCart(response.data);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新購物車失敗');
    }
  };

  const removeCartItem = async (menuItemId: number) => {
    try {
      const response = await apiRequest<{ message: string; data: CartItem[] }>(
        `/api/cart/items/${menuItemId}`,
        {
          method: 'DELETE',
        },
      );
      setCart(response.data);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刪除購物車項目失敗');
    }
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      setMessage('購物車是空的，請先選擇餐點。');
      return;
    }

    if (cartHasInactiveItems) {
      setMessage('購物車內含已下架商品，請先移除後再送單。');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await apiRequest<{ message: string; orderId: number | null }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((cartItem) => ({
            menuItemId: cartItem.menuItemId,
            qty: cartItem.qty,
          })),
        }),
      });

      setCart([]);
      setOrderStatus({
        id: response.orderId,
        status: 'submitted',
        message: '訂單已送出，等待店家接單。',
      });
      setMessage(response.message);
      if (activeTab === 'history') {
        await loadHistory();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '送出訂單失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Customer</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">歡迎回來，{session?.user.name ?? '車手'}。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              先登入後才能點餐，購物車會同步到資料庫，不會因為重新整理或換裝置而消失。
            </p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${buildStatusClass(orderStatus.status)}`}>
            {orderStatus.status === 'PREPARING' ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {orderStatus.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : null}
            {orderStatus.message}
          </div>
        </div>
      </header>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('menu')}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${
                activeTab === 'menu'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
              }`}
            >
              <Store size={16} />
              菜單
            </button>
            <button
              onClick={() => {
                void loadHistory();
              }}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
              }`}
            >
              <ReceiptText size={16} />
              歷史訂單
            </button>
            <button
              onClick={() => {
                void Promise.all([loadMenu(), loadCart()]);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-800"
            >
              <RefreshCw size={16} />
              重新整理
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] bg-white px-6 py-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
              正在載入菜單與購物車...
            </div>
          ) : activeTab === 'menu' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {menu.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                      <Store size={32} />
                    </div>
                  )}
                  <div className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {item.category}
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">{item.name}</h3>
                      </div>
                      <div className="text-lg font-black text-slate-900">{formatCurrency(item.price)}</div>
                    </div>
                    <p className="min-h-[3.5rem] text-sm leading-6 text-slate-500">
                      {item.description || '尚未提供品項說明。'}
                    </p>
                    <button
                      onClick={() => {
                        void addToCart(item.id);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-500"
                    >
                      <Plus size={16} />
                      加入購物車
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {historyOrders.length === 0 ? (
                <div className="rounded-[2rem] bg-white px-6 py-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                  目前沒有歷史訂單。
                </div>
              ) : (
                historyOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-[2rem] bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">訂單 #{order.id}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          建立時間：{new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {order.status}
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ShoppingBasket size={18} />
                購物車
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {cart.length} 項
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  尚未加入任何商品。
                </div>
              ) : (
                cart.map((cartItem) => (
                  <div key={cartItem.cartItemId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{cartItem.item.name}</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          單價 {formatCurrency(cartItem.item.price)}
                        </p>
                        {!cartItem.item.isActive ? (
                          <p className="mt-2 text-xs font-semibold text-red-600">此商品已下架，請先移除。</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => {
                          void removeCartItem(cartItem.menuItemId);
                        }}
                        className="rounded-full bg-white p-2 text-slate-400 transition hover:text-red-600"
                        aria-label="移除商品"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                        <button
                          onClick={() => {
                            void updateCartQuantity(cartItem.menuItemId, cartItem.qty - 1);
                          }}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="減少數量"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold text-slate-900">
                          {cartItem.qty}
                        </span>
                        <button
                          onClick={() => {
                            void updateCartQuantity(cartItem.menuItemId, cartItem.qty + 1);
                          }}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="增加數量"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(cartItem.item.price * cartItem.qty)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>總計</span>
                <span className="text-xl font-black text-white">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={() => {
                  void submitOrder();
                }}
                disabled={cart.length === 0 || isSubmitting || cartHasInactiveItems}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Zap size={16} />}
                送出訂單
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function KitchenView() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    try {
      const response = await apiRequest<{ message: string; data: ActiveOrder[] }>(
        '/api/kitchen/orders/active',
      );
      setOrders(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '載入 KDS 訂單失敗');
    }
  };

  useEffect(() => {
    void loadOrders();

    const ws = new WebSocket(`${WS_BASE_URL}/ws/kitchen`);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string };
      if (payload.type === 'NEW_ORDER') {
        void loadOrders();
      }
    };

    return () => ws.close();
  }, []);

  const updateStatus = async (orderId: number, status: 'PREPARING' | 'COMPLETED') => {
    try {
      const response = await apiRequest<{ message: string }>(`/api/kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setMessage(response.message);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新訂單狀態失敗');
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-slate-950 px-6 py-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300">Kitchen display system</p>
        <h2 className="mt-2 text-3xl font-black">店家 KDS 工作台</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          顧客介面不再混用 KDS。店員登入並通過白名單後，才會看見這個專屬工作台。
        </p>
      </header>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {orders.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
            目前沒有待處理訂單。
          </div>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Order</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">#{order.id}</h3>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    order.status === 'PREPARING'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">商品項目</p>
                  <div className="mt-2 space-y-2">
                    {order.items.length > 0 ? (
                      order.items.map((item) => (
                        <p key={item.id} className="font-semibold text-slate-900">
                          {item.snapshotItem.name} x {item.qty}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">未提供商品資料</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">金額</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">進站時間</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {order.submittedAt ? new Date(order.submittedAt).toLocaleString() : '未記錄'}
                  </p>
                  <p className="mt-1 text-sm">
                    <OrderTimer submittedAt={order.submittedAt} />
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                {order.status !== 'PREPARING' ? (
                  <button
                    onClick={() => {
                      void updateStatus(order.id, 'PREPARING');
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
                  >
                    <Clock3 size={16} />
                    開始製作
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    void updateStatus(order.id, 'COMPLETED');
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                >
                  <CheckCircle2 size={16} />
                  完成訂單
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function AdminView() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<MenuFormState>(emptyMenuForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboard = async () => {
    try {
      const [reportResponse, menuResponse] = await Promise.all([
        apiRequest<{ message: string; data: RevenueReport }>('/api/admin/revenue'),
        apiRequest<{ message: string; data: MenuItem[] }>('/api/admin/menu'),
      ]);
      setReport(reportResponse.data);
      setMenu(menuResponse.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '載入後台資料失敗');
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyMenuForm);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      isActive: item.isActive,
    });
  };

  const submitMenu = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || !Number.isFinite(price) || price <= 0) {
      setMessage('請完整填寫菜單名稱、分類與有效價格。');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const body = JSON.stringify({
        name: form.name,
        price,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        isActive: form.isActive,
      });

      const response = editingId
        ? await apiRequest<{ message: string; data: MenuItem }>(`/api/admin/menu/${editingId}`, {
            method: 'PUT',
            body,
          })
        : await apiRequest<{ message: string; data: MenuItem }>('/api/admin/menu', {
            method: 'POST',
            body,
          });

      setMessage(response.message);
      resetForm();
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存菜單失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMenuStatus = async (item: MenuItem) => {
    try {
      const response = await apiRequest<{ message: string; data: MenuItem }>(`/api/admin/menu/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name,
          price: item.price,
          category: item.category,
          description: item.description ?? '',
          imageUrl: item.imageUrl ?? '',
          isActive: !item.isActive,
        }),
      });
      setMessage(response.message);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新菜單狀態失敗');
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-emerald-950 px-6 py-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">Manager dashboard</p>
        <h2 className="mt-2 text-3xl font-black">店長營運後台</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-100/80">
          這裡直接取代手動執行 seed。你可以在網頁上調整菜單圖片、價格、上架狀態，並同時查看每日營收與熱銷排行。
        </p>
      </header>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="今日營收"
          value={report ? formatCurrency(report.totalRevenue) : '--'}
          tone="emerald"
        />
        <StatCard
          icon={ListOrdered}
          label="今日訂單數"
          value={report ? String(report.orderCount) : '--'}
          tone="sky"
        />
        <StatCard
          icon={ReceiptText}
          label="平均客單價"
          value={report ? formatCurrency(report.averageOrderValue) : '--'}
          tone="amber"
        />
        <StatCard
          icon={LayoutDashboard}
          label="統計日期"
          value={report?.date ?? '--'}
          tone="slate"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">熱銷排行榜</h3>
              <p className="mt-2 text-sm text-slate-500">依今日銷量與營收統整最熱門品項。</p>
            </div>
            <button
              onClick={() => {
                void loadDashboard();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <RefreshCw size={16} />
              更新
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {report?.topItems.length ? (
              report.topItems.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                      <Store />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      銷量 {item.qty} 份，營收 {formatCurrency(item.revenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-slate-400">
                今天還沒有可統計的熱銷資料。
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {Object.entries(report?.statusBreakdown ?? {}).map(([status, count]) => (
              <div key={status} className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{status}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">{editingId ? '編輯菜單' : '新增菜單'}</h3>
              <p className="mt-2 text-sm text-slate-500">以圖片網址、品名、價格與上下架狀態管理菜單。</p>
            </div>
            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                取消編輯
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              菜單名稱
              <input
                value={form.name}
                onChange={(event) => {
                  const v = event.currentTarget.value;
                  setForm((current) => ({ ...current, name: v }));
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                價格
                  <input
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(event) => {
                    const v = event.currentTarget.value;
                    setForm((current) => ({ ...current, price: v }));
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                分類
                <input
                value={form.category}
                onChange={(event) => {
                  const v = event.currentTarget.value;
                  setForm((current) => ({ ...current, category: v }));
                }}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              圖片網址
              <input
                value={form.imageUrl}
                onChange={(event) => {
                  const v = event.currentTarget.value;
                  setForm((current) => ({ ...current, imageUrl: v }));
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="https://..."
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              描述
              <textarea
                value={form.description}
                onChange={(event) => {
                  const v = event.currentTarget.value;
                  setForm((current) => ({ ...current, description: v }));
                }}
                className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </label>
            <label className="inline-flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setForm((current) => ({ ...current, isActive: checked }));
                }}
              />
              上架中
            </label>
            <button
              onClick={() => {
                void submitMenu();
              }}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <PencilLine size={16} />}
              {editingId ? '儲存修改' : '新增菜單'}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">菜單管理</h3>
            <p className="mt-2 text-sm text-slate-500">可直接上架、下架與編輯現有餐點。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {menu.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Store />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-lg font-bold text-slate-900">{item.name}</h4>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.isActive ? '上架中' : '已下架'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.description || '尚無描述'}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{item.category}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">{formatCurrency(item.price)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => startEdit(item)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <PencilLine size={16} />
                    編輯
                  </button>
                  <button
                    onClick={() => {
                      void toggleMenuStatus(item);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    {item.isActive ? <Store size={16} /> : <CheckCircle2 size={16} />}
                    {item.isActive ? '下架' : '重新上架'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'amber' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'sky'
        ? 'bg-sky-100 text-sky-700'
        : tone === 'amber'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon />
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </article>
  );
}
