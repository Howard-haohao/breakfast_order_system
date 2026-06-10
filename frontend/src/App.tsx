import { useEffect, useState } from 'react';
import { ShoppingCart, Zap, CheckCircle2, Clock, ChefHat, Flag, Navigation } from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; description: string };
type OrderStatus = { id: number | null; status: string; message: string };
// 廚房訂單型別
type ActiveOrder = { id: number; userId: string; total: number; status: string; submittedAt: string };

export default function App() {
  const [view, setView] = useState<'customer' | 'kitchen'>('customer');

  return (
    <div className="min-h-screen bg-[#f8f8f7] font-sans text-slate-800">
      {/* 頂部全域導覽列 */}
      <nav className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-wider">
          <Flag className="text-blue-500" fill="currentColor" /> 極速晨食 系統中樞
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('customer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${view === 'customer' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Navigation size={18} /> 車手點餐區
          </button>
          <button 
            onClick={() => setView('kitchen')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${view === 'kitchen' ? 'bg-orange-600' : 'hover:bg-slate-800'}`}
          >
            <ChefHat size={18} /> 後勤維修站 (KDS)
          </button>
        </div>
      </nav>

      {/* 根據視圖切換元件 */}
      <div className="p-8">
        {view === 'customer' ? <CustomerView /> : <KitchenView />}
      </div>
    </div>
  );
}

// ==========================================
// 🏎️ 車手點餐區 (Customer View)
// ==========================================
function CustomerView() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>({ id: null, status: 'IDLE', message: '尚未進站' });

  // 控制目前分頁與歷史紀錄的狀態
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/menu').then(res => res.json()).then(data => setMenu(data.data));

    const ws = new WebSocket('ws://localhost:3000/ws/orders');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ORDER_STATUS_UPDATED') {
        setOrderStatus({ id: data.orderId, status: data.status, message: data.message });
      }
    };
    return () => ws.close();
  }, []);

  // 新增：切換到歷史戰績時，去後端拉取資料
  const fetchHistory = () => {
    fetch('http://localhost:3000/api/orders/history?userId=racer_001')
      .then(res => res.json())
      .then(data => {
        setHistoryOrders(data.data);
        setActiveTab('history');
      });
  };

  const addToCart = (item: MenuItem) => setCart([...cart, item]);

  const submitOrder = async () => {
    if (cart.length === 0) return alert('購物車是空的，車手請先選擇裝備！');
    try {
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'racer_001', items: cart.map(item => ({ menuItemId: item.id, qty: 1 })) })
      });
      const result = await response.json();
      setOrderStatus({ id: result.orderId, status: 'submitted', message: '🏎️ 訂單已送出，等待技師接單...' });
      setCart([]);
    } catch (error) { console.error('下單失敗:', error); }
  };

  return (
    <main className="max-w-5xl mx-auto grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <div className="flex justify-between items-end mb-4 border-b pb-2">
          {/* 👇 新增：分頁切換按鈕 */}
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('menu')}
                className={`text-2xl font-bold flex items-center gap-2 ${activeTab === 'menu' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Zap size={24} /> 賽道補給
              </button>
              <button 
                onClick={fetchHistory}
                className={`text-2xl font-bold flex items-center gap-2 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Clock size={24} /> 歷史訂單紀錄
              </button>
            </div>
          
          {/* 狀態雷達區塊 */}
          <div className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-sm text-sm transition-colors duration-500 ${
            orderStatus.status === 'PREPARING' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
            orderStatus.status === 'COMPLETED' ? 'bg-green-100 text-green-600 border border-green-200' :
            orderStatus.status === 'submitted' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
            'bg-white text-slate-400 border border-slate-200'
          }`}>
            {orderStatus.status === 'PREPARING' && <Clock size={16} className="animate-spin" />}
            {orderStatus.status === 'COMPLETED' && <CheckCircle2 size={16} />}
            {orderStatus.message}
          </div>
        </div>
        
        {/* 👇 新增：根據分頁狀態顯示菜單或歷史紀錄 */}
        {activeTab === 'menu' ? (
          menu.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-slate-500 text-sm">{item.description}</p>
                <div className="text-blue-600 font-bold mt-1">${item.price}</div>
              </div>
              <button onClick={() => addToCart(item)} className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors">
                選取
              </button>
            </div>
          ))
        ) : (
          <div className="space-y-4">
            {historyOrders.length === 0 ? <div className="text-slate-400 text-center py-8">尚無戰績</div> : 
              historyOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">訂單 #{order.id}</h3>
                    <p className="text-slate-500 text-sm">時間: {new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg mb-1">${order.total}</div>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      <div className="col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-24">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ShoppingCart size={20} /> 裝備清單</h2>
          <div className="min-h-32 mb-4 space-y-2">
            {cart.length === 0 ? <div className="text-slate-400 text-sm text-center pt-8">尚無裝備</div> : 
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                  <span>{item.name}</span><span className="font-semibold">${item.price}</span>
                </div>
              ))}
          </div>
          <button onClick={submitOrder} disabled={cart.length === 0} className="w-full bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
            <Zap size={18} fill="currentColor" /> 下單
          </button>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// 👨‍🍳 後勤維修站 (Kitchen View)
// ==========================================
function KitchenView() {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  const fetchOrders = () => {
    fetch('http://localhost:3000/api/kitchen/orders/active')
      .then(res => res.json())
      .then(data => setActiveOrders(data.data))
      .catch(err => console.error('無法載入廚房訂單', err));
  };

  useEffect(() => {
    fetchOrders(); // 初始載入

    // 啟動廚房專用雷達
    const ws = new WebSocket('ws://localhost:3000/ws/kitchen');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_ORDER') {
        fetchOrders(); // 收到新訂單廣播，立刻重新拉取訂單列表
      }
    };
    return () => ws.close();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    await fetch(`http://localhost:3000/api/kitchen/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders(); // 更新後重新拉取
  };

  return (
    <main className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-orange-600">
        <ChefHat /> 待處理進站單 (KDS)
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {activeOrders.length === 0 ? (
          <div className="col-span-2 text-center text-slate-400 py-12 bg-white rounded-xl border border-dashed">目前賽道淨空，沒有待處理訂單</div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <span className="text-lg font-bold">訂單 #{order.id}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'PREPARING' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {order.status === 'PREPARING' ? '注入氮氣中 (PREPARING)' : '剛進站 (SUBMITTED)'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-6">進站時間: {new Date(order.submittedAt).toLocaleTimeString()}</p>
              
              <div className="flex gap-2">
                {order.status !== 'PREPARING' && (
                  <button onClick={() => updateStatus(order.id, 'PREPARING')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold transition-colors">
                    開始製作
                  </button>
                )}
                <button onClick={() => updateStatus(order.id, 'COMPLETED')} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-colors">
                  完成並通知車手
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}