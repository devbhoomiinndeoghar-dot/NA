import React, { useState, useEffect } from "react";
import { User, MenuCategory, MenuItem, Order, RestaurantSettings } from "../types";
import { api } from "../api";
import { Logo } from "./Logo";
import { PWAInstallButton } from "./PWAInstallButton";
import { ShoppingCart, Check, Clock, ShieldAlert, X, ChevronRight, RefreshCw } from "lucide-react";

interface CustomerViewProps {
  user: Omit<User, "passwordHash"> | null;
  onLogout: () => void;
  onNavigateToLogin: () => void;
}

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export const CustomerView: React.FC<CustomerViewProps> = ({ user, onLogout, onNavigateToLogin }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Checkout info
  const [customerName, setCustomerName] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryDistance, setDeliveryDistance] = useState<number>(2); // Default 2 km

  // Order state
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [txRef, setTxRef] = useState<string>("");
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);

  // Errors / Loading
  const [loading, setLoading] = useState<boolean>(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    if (user) {
      setCustomerName(user.name);
      setContactNumber(user.contactNumber);
      setDeliveryAddress(user.deliveryAddress);
      loadMyOrders();
    }
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (trackingOrderId) {
      fetchTrackingOrder(trackingOrderId);
      interval = setInterval(() => {
        fetchTrackingOrder(trackingOrderId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [trackingOrderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, items, setts] = await Promise.all([
        api.getCategories(),
        api.getMenuItems(),
        api.getSettings(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setSettings(setts);
      setError(null);
    } catch (err: any) {
      setError("Failed to load menu data from Server.");
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    if (!user) return;
    try {
      const orders = await api.getOrders();
      setMyOrders(orders);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrackingOrder = async (id: string) => {
    try {
      const order = await api.getOrder(id);
      setTrackingOrder(order);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (item: MenuItem, qty: number = 1) => {
    if (item.availability === "OUT_STOCK") return;

    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.id ? { ...i, quantity: Math.min(i.quantity + qty, 10) } : i
        );
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: qty }];
    });
    setSuccessMsg(`Added ${item.name} to bag!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.itemId === itemId) {
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            return { ...i, quantity: Math.min(newQty, 10) };
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstPercent = settings?.gstRate ?? 5;
  const gstAmount = Math.round((cartSubtotal * (gstPercent / 100)) * 100) / 100;

  const deliveryRatePerKm = settings?.deliveryRatePerKm ?? 50;
  const maxDeliveryCharge = settings?.maxDeliveryCharge ?? 100;
  let rawDeliveryCharge = deliveryDistance * deliveryRatePerKm;
  if (rawDeliveryCharge > maxDeliveryCharge) {
    rawDeliveryCharge = maxDeliveryCharge;
  }
  const deliveryCharge = Math.round(rawDeliveryCharge * 100) / 100;

  const grossTotal = cartSubtotal + gstAmount + deliveryCharge;
  const finalPayable = Math.round(grossTotal);
  const roundOff = Math.round((finalPayable - grossTotal) * 100) / 100;

  const handlePlaceOrder = async () => {
    if (!user) {
      onNavigateToLogin();
      return;
    }
    if (cart.length === 0) return;
    if (!customerName || !contactNumber || !deliveryAddress) {
      setOrderError("Please complete your name, mobile, and address fields.");
      return;
    }

    try {
      setOrderError(null);
      const itemsPayload = cart.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        quantity: i.quantity,
      }));

      const order = await api.createOrder({
        customerName,
        contactNumber,
        deliveryAddress,
        deliveryDistance,
        items: itemsPayload,
      });

      setPlacedOrder(order);
      setTrackingOrderId(order.id);
      setTrackingOrder(order);
      setCart([]);
      loadMyOrders();
    } catch (err: any) {
      setOrderError(err.message || "Failed to place order.");
    }
  };

  const handleSubmitPaymentRef = async () => {
    if (!trackingOrder || !txRef.trim()) return;
    try {
      setIsSubmittingTx(true);
      const res = await api.submitPayment(trackingOrder.id, txRef.trim());
      setTrackingOrder(res.order);
      setSuccessMsg("UPI Ref Saved. Awaiting Verification.");
      setTxRef("");
      loadMyOrders();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setOrderError(err.message || "Failed to submit reference.");
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const upiUrl = settings
    ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(
        settings.upiName
      )}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent("Order " + (placedOrder?.id || ""))}`
    : "";

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="bg-[#FDFDFB] min-h-screen text-[#1A1A1A] font-sans">
      {/* Dynamic Toast banner */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[#1A1A1A] text-white px-6 py-4 border-4 border-[#FF6B35] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3 font-black uppercase tracking-wider text-sm animate-bounce">
          <Check className="w-5 h-5 text-[#FF6B35]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Brutalist Header */}
      <header className="h-20 border-b-4 border-[#1A1A1A] flex items-center justify-between px-4 sm:px-8 bg-[#FF6B35] sticky top-0 z-40">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-none italic text-[#1A1A1A] select-none">
            MASALA EXPRESS
          </h1>
          <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase opacity-90 text-[#1A1A1A]">
            Deoghar • V Bazar, Barfani Tower • 814112
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex bg-[#1A1A1A] p-1 rounded-full border border-[#1A1A1A]">
            <button
              onClick={() => {
                setActiveTab("menu");
                setPlacedOrder(null);
              }}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${
                activeTab === "menu" ? "bg-white text-[#1A1A1A]" : "text-white opacity-60 hover:opacity-100"
              }`}
            >
              Menu
            </button>
            {user && (
              <button
                onClick={() => {
                  setActiveTab("orders");
                  setPlacedOrder(null);
                  loadMyOrders();
                }}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${
                  activeTab === "orders" ? "bg-white text-[#1A1A1A]" : "text-white opacity-60 hover:opacity-100"
                }`}
              >
                Orders
              </button>
            )}
          </nav>

          <PWAInstallButton />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-xs font-black uppercase tracking-wider border-2 border-[#1A1A1A] bg-white px-3 py-1">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-black uppercase tracking-wider hover:bg-white hover:text-[#1A1A1A] border-2 border-[#1A1A1A] transition"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={onNavigateToLogin}
              className="px-4 py-1.5 sm:py-2.5 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              Sign In
            </button>
          )}

          {/* Bag trigger */}
          <button
            onClick={() => setShowCart(true)}
            className="p-2 sm:p-3 bg-[#1A1A1A] hover:bg-[#FF6B35] text-white hover:text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all flex items-center justify-center relative"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-[#1A1A1A] font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1A1A1A] shadow-sm">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-8 border-4 border-[#1A1A1A] p-4 bg-red-100 text-[#1A1A1A] flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <ShieldAlert className="w-6 h-6 text-[#FF6B35]" />
            <span className="font-black uppercase tracking-wide text-xs">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="w-12 h-12 text-[#FF6B35] animate-spin mb-4" />
            <span className="font-black uppercase tracking-widest text-sm text-[#1A1A1A]">Loading kitchen menu...</span>
          </div>
        ) : activeTab === "menu" && !placedOrder ? (
          /* ==================================
             MENU VIEW (Brutalist style)
             ================================== */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Categories (Desktop) */}
            <aside className="hidden lg:block lg:col-span-1 bg-[#F7F7F2] border-4 border-[#1A1A1A] p-6 flex flex-col gap-8 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-[#FF6B35]">
                  Menu Categories
                </h3>
                <nav className="flex flex-col gap-3">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`text-left text-lg font-black uppercase tracking-tight transition-transform duration-100 ${
                      activeCategory === "all"
                        ? "text-xl text-[#1A1A1A] translate-x-2 italic underline decoration-4 underline-offset-4 decoration-[#FF6B35]"
                        : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    All Items ({menuItems.length})
                  </button>
                  {categories.map((cat) => {
                    const count = menuItems.filter((i) => i.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`text-left text-lg font-black uppercase tracking-tight transition-all duration-100 flex justify-between items-center ${
                          activeCategory === cat.id
                            ? "text-xl text-[#1A1A1A] translate-x-2 italic underline decoration-4 underline-offset-4 decoration-[#FF6B35]"
                            : "opacity-40 hover:opacity-100"
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] font-bold bg-[#1A1A1A] text-white px-1.5 py-0.5">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Minimal Store Status Widget */}
              <div className="mt-auto p-4 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(255,107,53,0.5)]">
                <p className="text-[8px] uppercase font-black tracking-widest mb-1 text-stone-400">Order Hotline</p>
                <p className="text-sm font-black text-[#FF6B35] uppercase">+91 7903494035</p>
                <p className="text-[9px] mt-2 opacity-80 leading-relaxed font-semibold">
                  At- V Bazar, Barfani Tower, H.K Banerjee Road, Deoghar
                </p>
              </div>
            </aside>

            {/* Menu Items Grid */}
            <div className="lg:col-span-3 space-y-8">
              {/* Mobile slider */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-2 sticky top-20 bg-[#FDFDFB] z-20 pt-1 -mx-4 px-4 border-b-2 border-[#1A1A1A]">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-4 py-2 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider whitespace-nowrap transition ${
                    activeCategory === "all" ? "bg-[#FF6B35] text-[#1A1A1A]" : "bg-white text-[#1A1A1A]"
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider whitespace-nowrap transition ${
                      activeCategory === cat.id ? "bg-[#FF6B35] text-[#1A1A1A]" : "bg-white text-[#1A1A1A]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu Sections */}
              <div className="space-y-12">
                {categories
                  .filter((cat) => activeCategory === "all" || activeCategory === cat.id)
                  .map((cat) => {
                    const items = menuItems.filter((i) => i.categoryId === cat.id);
                    if (items.length === 0) return null;

                    return (
                      <section key={cat.id} className="scroll-mt-24">
                        <div className="flex items-center gap-4 mb-6">
                          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic text-[#1A1A1A]">
                            {cat.name}
                          </h2>
                          <div className="h-1 bg-[#1A1A1A] flex-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {items.map((item) => {
                            const isOutOfStock = item.availability === "OUT_STOCK";
                            return (
                              <div
                                key={item.id}
                                className={`p-5 flex flex-col justify-between bg-white border-4 transition-all duration-150 ${
                                  isOutOfStock
                                    ? "border-gray-300 opacity-60 bg-gray-50"
                                    : "border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                                      isOutOfStock ? "bg-gray-400 text-white" : "bg-[#1A1A1A] text-white"
                                    }`}>
                                      {isOutOfStock ? "OUT OF STOCK" : "IN STOCK"}
                                    </span>
                                    <span className="text-xl font-black font-sans text-[#FF6B35]">₹{item.price}</span>
                                  </div>

                                  <div className="flex gap-4">
                                    {/* Image block */}
                                    <div className="w-16 h-16 rounded-none bg-stone-100 border-2 border-[#1A1A1A] flex-shrink-0 flex items-center justify-center overflow-hidden">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-xl">🍲</span>
                                      )}
                                    </div>

                                    <div>
                                      <h4 className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">{item.name}</h4>
                                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                                        {item.description || "Tenderly prepared with direct house spice blends."}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  disabled={isOutOfStock}
                                  onClick={() => addToCart(item, 1)}
                                  className={`mt-5 w-full py-2.5 font-black uppercase tracking-wider text-xs border-2 border-[#1A1A1A] transition-colors ${
                                    isOutOfStock
                                      ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                                      : "bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] cursor-pointer"
                                  }`}
                                >
                                  {isOutOfStock ? "Out Of Stock" : "Add to Bag"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : activeTab === "orders" ? (
          /* ==================================
             MY ORDERS LIST
             ================================== */
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#1A1A1A] border-b-4 border-[#1A1A1A] pb-2">
              My Historical Orders
            </h2>

            {myOrders.length === 0 ? (
              <div className="border-4 border-[#1A1A1A] p-8 text-center bg-[#F7F7F2] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                <p className="text-lg font-black uppercase tracking-wide">No orders recorded yet!</p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="mt-4 px-6 py-3 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] font-black uppercase text-xs tracking-widest transition"
                >
                  Explore Menu Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border-4 border-[#1A1A1A] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-[#1A1A1A] text-sm sm:text-base">
                          {order.id}
                        </span>
                        <span className="bg-[#1A1A1A] text-[#FF6B35] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
                          {order.orderStatus}
                        </span>
                        <span className="border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 text-[9px] font-black uppercase">
                          {order.paymentStatus === "PAID" ? "PAID" : "UNPAID"}
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mt-2">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>

                      <div className="text-xs text-stone-800 font-bold mt-2 truncate max-w-lg">
                        {order.items.map((it) => `${it.name} (x${it.quantity})`).join(", ")}
                      </div>

                      {order.orderStatus === "ACCEPTED" && (
                        <div className="mt-3 p-2 bg-[#1A1A1A] text-[#FF6B35] inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                          <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: "8s" }} />
                          <span>Estimated preparation: 30-40 mins</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0 text-right">
                      <div className="text-xl font-black text-[#FF6B35] font-mono">
                        ₹{order.finalTotal}
                      </div>
                      <button
                        onClick={() => {
                          setPlacedOrder(order);
                          setTrackingOrderId(order.id);
                          setTrackingOrder(order);
                        }}
                        className="mt-2 text-xs font-black uppercase text-[#1A1A1A] underline decoration-2 decoration-[#FF6B35] hover:text-[#FF6B35] transition"
                      >
                        Track Receipt &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ==================================
             ORDER TRACKER & RECEIPT VIEW (Brutalist)
             ================================== */
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Live Status Tracker */}
            <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
              <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-4 mb-6">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">Order ID</div>
                  <div className="font-mono font-black text-xl text-[#1A1A1A]">{trackingOrder?.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">Status</div>
                  <div className="font-black text-xs text-[#FF6B35] uppercase bg-[#1A1A1A] px-2 py-1 leading-none mt-1">
                    {trackingOrder?.orderStatus}
                  </div>
                </div>
              </div>

              {/* Acceptance notice */}
              {trackingOrder?.orderStatus === "ACCEPTED" && (
                <div className="mb-6 p-4 bg-[#1A1A1A] text-white border-4 border-[#FF6B35] flex items-center gap-3">
                  <div className="p-1 bg-[#FF6B35] rounded-full text-[#1A1A1A]">
                    <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Kitchen Est. Preparation</div>
                    <div className="font-black text-lg text-[#FF6B35]">30–40 MINUTES</div>
                  </div>
                </div>
              )}

              {/* Brutalist status timeline */}
              <div className="space-y-6 mt-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[3px] before:bg-[#1A1A1A]">
                {[
                  { label: "PENDING", desc: "Submitted to kitchen", status: "PENDING" },
                  { label: "ACCEPTED", desc: "Chef starting prep", status: "ACCEPTED" },
                  { label: "PREPARING", desc: "Spices brewing & sizzling", status: "PREPARING" },
                  { label: "READY", desc: "Dish packaged hot", status: "READY" },
                  { label: "OUT FOR DELIVERY", desc: "Rider on the way", status: "OUT_FOR_DELIVERY" },
                  { label: "DELIVERED", desc: "Feast completed!", status: "DELIVERED" },
                ].map((step, idx) => {
                  const statuses = ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
                  const currentIdx = statuses.indexOf(trackingOrder?.orderStatus || "PENDING");
                  const stepIdx = statuses.indexOf(step.status);
                  const isDone = stepIdx <= currentIdx;
                  const isCurrent = stepIdx === currentIdx;

                  return (
                    <div key={idx} className="flex items-start gap-4">
                      <div
                        className={`w-9 h-9 rounded-none border-2 flex items-center justify-center font-black text-xs shrink-0 z-10 transition ${
                          isDone
                            ? "bg-[#FF6B35] border-[#1A1A1A] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]"
                            : "bg-white border-stone-200 text-stone-400"
                        }`}
                      >
                        {isDone && !isCurrent ? <Check className="w-4 h-4 text-[#1A1A1A]" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-black uppercase ${
                            isCurrent ? "text-[#FF6B35]" : isDone ? "text-stone-950" : "text-stone-400"
                          }`}
                        >
                          {step.label}
                        </div>
                        <div className="text-xs text-stone-500 font-semibold">{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Receipt & Online Payment Portal */}
            <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 underline decoration-4 decoration-[#FF6B35] underline-offset-4">
                  Receipt Summary
                </h3>

                {/* Items */}
                <div className="space-y-3 mb-6">
                  {trackingOrder?.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold border-b border-stone-100 pb-2">
                      <div>
                        <span className="uppercase text-[#1A1A1A]">{item.name}</span>
                        <span className="text-stone-500 ml-2">x {item.quantity}</span>
                      </div>
                      <span className="font-mono text-stone-900">₹{item.total}</span>
                    </div>
                  ))}
                </div>

                {/* Calculations */}
                <div className="border-t-2 border-[#1A1A1A] pt-4 space-y-2 text-xs font-bold uppercase text-[#1A1A1A]">
                  <div className="flex justify-between">
                    <span>Item Subtotal</span>
                    <span className="font-mono">₹{trackingOrder?.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({trackingOrder?.gstPercent}%)</span>
                    <span className="font-mono">₹{trackingOrder?.gstAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge ({trackingOrder?.deliveryDistance} KM)</span>
                    <span className="font-mono">₹{trackingOrder?.deliveryCharge}</span>
                  </div>
                  {trackingOrder?.roundOff !== 0 && (
                    <div className="flex justify-between text-[#FF6B35] italic">
                      <span>Round-Off</span>
                      <span className="font-mono">
                        {trackingOrder && trackingOrder.roundOff > 0 ? "+" : ""}
                        ₹{trackingOrder?.roundOff}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-black uppercase pt-3 border-t-4 border-[#1A1A1A]">
                    <span>Total Paid</span>
                    <span className="text-[#FF6B35] font-mono">₹{trackingOrder?.finalTotal}</span>
                  </div>
                </div>

                {/* Online Payment Scanner */}
                <div className="mt-8 border-4 border-[#1A1A1A] bg-[#F7F7F2] p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider text-center mb-1">
                    Instant UPI Payment
                  </h4>
                  <p className="text-[10px] text-stone-500 font-bold text-center mb-4 leading-relaxed">
                    Scan with any UPI application (GPay, PhonePe, Paytm, etc)
                  </p>

                  <div className="flex flex-col items-center justify-center">
                    {/* QR Code Container with Brutalist shadow */}
                    <div className="bg-white p-3 border-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] mb-4 relative">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-36 h-36" />
                    </div>

                    <div className="text-center text-xs font-bold uppercase space-y-1 mt-2 text-[#1A1A1A]">
                      <div>
                        <span className="text-stone-500">Merchant:</span>{" "}
                        <span className="font-black">{settings?.upiName || "MASALA EXPRESS"}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 font-mono">UPI ID:</span>{" "}
                        <span className="font-mono text-[11px] bg-white px-2 py-1 border border-[#1A1A1A]">
                          {settings?.upiId || "gpay-12202329876@okbizaxis"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Form */}
                  <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A] space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                      Enter UPI Reference/Transaction ID
                    </label>

                    {trackingOrder?.paymentReference ? (
                      <div className="p-3 bg-white border-2 border-green-600 text-green-800 text-xs font-bold uppercase flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(22,101,52,0.15)]">
                        <div className="flex items-center gap-1">
                          <span>Submitted for Verification</span>
                        </div>
                        <div className="font-mono text-[9px] text-stone-500 mt-1">
                          Ref: {trackingOrder.paymentReference}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter 12-digit UPI reference"
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value)}
                          className="flex-1 bg-white border-2 border-[#1A1A1A] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#FF6B35] text-[#1A1A1A]"
                        />
                        <button
                          disabled={isSubmittingTx || !txRef.trim()}
                          onClick={handleSubmitPaymentRef}
                          className="px-4 py-2 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs uppercase tracking-wider transition disabled:opacity-50"
                        >
                          {isSubmittingTx ? "Saving" : "Submit"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between border-t-2 border-stone-100 pt-4">
                <button
                  onClick={() => {
                    setPlacedOrder(null);
                    setTrackingOrderId(null);
                    setTrackingOrder(null);
                    setActiveTab("menu");
                  }}
                  className="px-4 py-2 border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-stone-100 text-xs font-black uppercase tracking-wider transition"
                >
                  &larr; Back to Menu
                </button>
                <button
                  onClick={() => loadMyOrders()}
                  className="px-4 py-2 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider transition"
                >
                  Reload Status
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================
         CART DRAWER (Bold Typography theme)
         ================================== */}
      {showCart && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex justify-end">
          <aside className="w-full max-w-md bg-white h-full border-l-4 border-[#1A1A1A] flex flex-col justify-between shadow-2xl relative animate-slide-in">
            {/* Header */}
            <div className="bg-[#FF6B35] text-[#1A1A1A] px-6 py-5 border-b-4 border-[#1A1A1A] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">Your Bag</h2>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-stone-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3" />
                  <p className="text-base font-black uppercase tracking-wider text-[#1A1A1A]">Your bag is empty!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.itemId}
                        className="p-4 border-2 border-[#1A1A1A] bg-[#F7F7F2] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex justify-between items-center"
                      >
                        <div>
                          <div className="text-sm font-black uppercase text-[#1A1A1A]">{item.name}</div>
                          <div className="text-sm font-black font-mono text-[#FF6B35] mt-1">
                            ₹{item.price}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 border-2 border-[#1A1A1A] px-2 py-1 bg-white">
                            <button
                              onClick={() => updateQuantity(item.itemId, -1)}
                              className="font-black text-sm w-4 text-center hover:text-[#FF6B35]"
                            >
                              -
                            </button>
                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.itemId, 1)}
                              className="font-black text-sm w-4 text-center hover:text-[#FF6B35]"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.itemId)}
                            className="p-1 text-stone-400 hover:text-red-500 transition"
                          >
                            <X className="w-5 h-5 text-[#1A1A1A]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout details */}
                  <div className="border-4 border-[#1A1A1A] bg-white p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-4 mt-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-[#FF6B35] border-b-2 border-stone-100 pb-1.5">
                      Delivery Details
                    </h4>

                    {orderError && (
                      <div className="p-3 bg-red-50 text-red-800 border-2 border-red-600 text-xs font-bold uppercase">
                        {orderError}
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs font-bold uppercase">
                      <label className="text-stone-500">Full Name</label>
                      <input
                        type="text"
                        placeholder=" राहुल कुमार "
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-stone-50 px-3 py-2 border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] text-stone-900"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs font-bold uppercase">
                      <label className="text-stone-500">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="7903494035"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full bg-stone-50 px-3 py-2 border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] text-stone-900 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs font-bold uppercase">
                      <label className="text-stone-500">Delivery Address</label>
                      <textarea
                        placeholder="Enter house, landmark details..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-stone-50 px-3 py-2 border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] text-stone-900"
                        rows={2}
                      />
                    </div>

                    {/* Delivery distance slider */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold uppercase mb-1">
                        <span className="text-stone-500">Simulate Distance</span>
                        <span className="font-black text-[#FF6B35]">{deliveryDistance} KM</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={deliveryDistance}
                        onChange={(e) => setDeliveryDistance(Number(e.target.value))}
                        className="w-full h-2 bg-stone-200 rounded-none appearance-none cursor-pointer accent-[#1A1A1A]"
                      />
                      <div className="text-[9px] font-bold text-stone-400 flex justify-between uppercase mt-1">
                        <span>1 KM (₹50)</span>
                        <span>Capped at ₹100 max</span>
                        <span>10 KM (₹100)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary Checkout */}
            {cart.length > 0 && (
              <div className="bg-white text-[#1A1A1A] p-6 border-t-4 border-[#1A1A1A]">
                <div className="space-y-2 text-xs font-bold uppercase border-b-2 border-[#1A1A1A] pb-4 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({gstPercent}%)</span>
                    <span className="font-mono">₹{gstAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee ({deliveryDistance} KM)</span>
                    <span className="font-mono">₹{deliveryCharge}</span>
                  </div>
                  {roundOff !== 0 && (
                    <div className="flex justify-between text-[#FF6B35] italic">
                      <span>Round-Off</span>
                      <span className="font-mono">
                        {roundOff > 0 ? "+" : ""}
                        ₹{roundOff}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-black uppercase pt-2 border-t-4 border-[#1A1A1A] mt-2">
                    <span>Total</span>
                    <span className="text-[#FF6B35] font-mono">₹{finalPayable}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-[#1A1A1A] hover:bg-[#FF6B35] text-white hover:text-[#1A1A1A] border-4 border-[#1A1A1A] font-black py-4 uppercase tracking-[0.2em] text-sm shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Checkout</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
