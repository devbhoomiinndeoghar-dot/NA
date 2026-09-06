import React, { useState, useEffect } from "react";
import { User, MenuCategory, MenuItem, Order, RestaurantSettings, OrderStatus, PaymentStatus } from "../types";
import { api } from "../api";
import { Logo } from "./Logo";
import { PWAInstallButton } from "./PWAInstallButton";
import { Clipboard, List, Settings, TrendingUp, AlertCircle, CheckCircle, Clock, Trash2, Edit, Plus, ToggleLeft, ToggleRight, X, RefreshCw, Smartphone, Phone, MapPin, DollarSign, Award, CreditCard, ChevronRight } from "lucide-react";

interface AdminViewProps {
  user: Omit<User, "passwordHash"> | null;
  onLogout: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "categories" | "settings">("orders");

  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  // States for CRUD operations
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [itemForm, setItemForm] = useState<Omit<MenuItem, "id">>({
    categoryId: "",
    name: "",
    description: "",
    price: 0,
    availability: "IN_STOCK",
    image: "",
  });

  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [categoryNameForm, setCategoryNameForm] = useState<string>("");

  const [settingsForm, setSettingsForm] = useState<RestaurantSettings>({
    upiId: "",
    upiName: "",
    upiQrBase64: "",
    gstRate: 5,
    deliveryRatePerKm: 50,
    maxDeliveryCharge: 100,
    restaurantAddress: "",
    restaurantPhone: "",
  });

  // Selected order details in a modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // General Loading/Errors
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [allOrders, cats, items, setts] = await Promise.all([
        api.getOrders(),
        api.getCategories(),
        api.getMenuItems(),
        api.getSettings(),
      ]);
      setOrders(allOrders);
      setCategories(cats);
      setMenuItems(items);
      setSettings(setts);
      if (setts) {
        setSettingsForm(setts);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Status & Payment actions
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
      showSuccess(`Order status updated to ${status}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, pStatus: PaymentStatus) => {
    try {
      const updated = await api.updateOrderPaymentStatus(orderId, pStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
      showSuccess(`Payment status updated to ${pStatus}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameForm.trim()) return;

    try {
      if (editingCategory) {
        const updated = await api.updateCategory(editingCategory.id, categoryNameForm.trim());
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? updated : c)));
        showSuccess("Category updated successfully");
      } else {
        const created = await api.createCategory(categoryNameForm.trim());
        setCategories((prev) => [...prev, created]);
        showSuccess("Category added successfully");
      }
      setCategoryNameForm("");
      setEditingCategory(null);
      setShowCategoryModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm("Are you sure? This will delete all items in this category immediately.")) return;
    try {
      await api.deleteCategory(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setMenuItems((prev) => prev.filter((i) => i.categoryId !== catId));
      showSuccess("Category and items deleted");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Menu Item Actions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "item" | "settings") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (field === "item") {
        setItemForm((prev) => ({ ...prev, image: base64 }));
      } else {
        setSettingsForm((prev) => ({ ...prev, upiQrBase64: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.categoryId || !itemForm.name || itemForm.price <= 0) {
      alert("Please check categories, title and price.");
      return;
    }

    try {
      if (editingItem) {
        const updated = await api.updateMenuItem(editingItem.id, itemForm);
        setMenuItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
        showSuccess("Menu item updated successfully");
      } else {
        const created = await api.createMenuItem(itemForm);
        setMenuItems((prev) => [...prev, created]);
        showSuccess("New menu item added");
      }
      setShowItemModal(false);
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await api.deleteMenuItem(id);
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
      showSuccess("Item removed from menu");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleItemStock = async (item: MenuItem) => {
    const nextStock = item.availability === "IN_STOCK" ? "OUT_STOCK" : "IN_STOCK";
    try {
      const updated = await api.updateMenuItem(item.id, { availability: nextStock });
      setMenuItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      showSuccess(`${item.name} is now ${nextStock === "IN_STOCK" ? "In Stock" : "Out of Stock"}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Settings Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSettings(settingsForm);
      setSettings(updated);
      showSuccess("Restaurant configuration updated");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.orderStatus === "PENDING");
  const acceptedPreparingOrders = orders.filter((o) => ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.orderStatus));
  const completedOrders = orders.filter((o) => o.orderStatus === "DELIVERED" && o.paymentStatus === "PAID");
  const totalSales = completedOrders.reduce((sum, o) => sum + o.finalTotal, 0);

  return (
    <div className="bg-[#FDFDFB] min-h-screen text-[#1A1A1A] font-sans">
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[#1A1A1A] text-white px-6 py-4 border-4 border-[#FF6B35] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3 font-black uppercase tracking-wider text-sm animate-bounce">
          <CheckCircle className="w-5 h-5 text-[#FF6B35]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-20 border-b-4 border-[#1A1A1A] flex items-center justify-between px-4 sm:px-8 bg-[#FF6B35]">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="text-left">
            <h1 className="font-sans font-black text-xl tracking-tighter italic leading-none text-[#1A1A1A]">
              MASALA EXPRESS
            </h1>
            <span className="text-[9px] text-[#1A1A1A] font-black uppercase tracking-widest leading-none">
              Control panel (Admin)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PWAInstallButton />
          <span className="hidden sm:inline-block text-xs font-black uppercase tracking-wider border-2 border-[#1A1A1A] bg-white px-3 py-1">
            Admin Profile
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-black uppercase tracking-wider hover:bg-white hover:text-[#1A1A1A] border-2 border-[#1A1A1A] transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Statistics Bar (Neo-brutalist bento blocks) */}
      <section className="bg-white py-8 px-4 border-b-4 border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-4">
            <div className="p-3 bg-[#FF6B35]/15 text-[#FF6B35] border-2 border-[#1A1A1A] shrink-0">
              <Clipboard className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">Total Orders</div>
              <div className="text-2xl font-black text-[#1A1A1A] mt-0.5">{totalOrders}</div>
            </div>
          </div>

          <div className="bg-white p-5 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 border-2 border-[#1A1A1A] shrink-0">
              <Clock className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">Pending</div>
              <div className="text-2xl font-black text-yellow-600 mt-0.5">{pendingOrders.length}</div>
            </div>
          </div>

          <div className="bg-white p-5 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 border-2 border-[#1A1A1A] shrink-0">
              <TrendingUp className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">Active Cook</div>
              <div className="text-2xl font-black text-purple-600 mt-0.5">{acceptedPreparingOrders.length}</div>
            </div>
          </div>

          <div className="bg-white p-5 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 border-2 border-[#1A1A1A] shrink-0">
              <DollarSign className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">Gross Income</div>
              <div className="text-2xl font-black text-green-600 mt-0.5">₹{totalSales}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex border-b-4 border-[#1A1A1A] gap-2 overflow-x-auto pb-0.5 mb-8">
          {[
            { id: "orders", label: "Live Orders", icon: Clipboard },
            { id: "menu", label: "Manage Menu", icon: List },
            { id: "categories", label: "Categories", icon: Award },
            { id: "settings", label: "Store Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-black uppercase tracking-wider transition-all border-t-4 border-x-4 border-[#1A1A1A] ${
                  activeTab === tab.id
                    ? "bg-[#FF6B35] text-[#1A1A1A] -mb-1 translate-y-1"
                    : "bg-[#F7F7F2] text-stone-500 hover:text-[#1A1A1A]"
                }`}
              >
                <Icon className="w-4 h-4 text-[#1A1A1A]" />
                <span>{tab.label}</span>
                {tab.id === "orders" && pendingOrders.length > 0 && (
                  <span className="bg-[#1A1A1A] text-white font-black text-[9px] px-2 py-0.5 ml-1">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 border-4 border-[#1A1A1A] bg-red-100 text-red-900 rounded-none mb-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-black uppercase tracking-wider">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="font-bold">X</button>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 text-[#FF6B35] animate-spin mr-3" />
            <span className="font-black uppercase tracking-widest text-xs text-stone-600">Retrieving state...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ==================================
               ORDERS TAB
               ================================== */}
            {activeTab === "orders" && (
              <div className="space-y-8">
                {/* Pending orders alert block */}
                {pendingOrders.length > 0 && (
                  <div className="border-4 border-[#1A1A1A] p-6 bg-[#F7F7F2] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                    <h3 className="font-sans font-black text-xl text-[#1A1A1A] flex items-center gap-2 mb-4">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="uppercase tracking-tight">INCOMING ORDERS ({pendingOrders.length})</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border-4 border-[#1A1A1A] p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start border-b-2 border-stone-100 pb-2 mb-3">
                              <span className="font-mono font-black text-[#FF6B35] text-sm">{order.id}</span>
                              <span className="text-[10px] font-bold text-stone-400 uppercase">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div>
                                <span className="text-stone-400 uppercase font-bold tracking-wider text-[10px]">Customer:</span>{" "}
                                <span className="font-black text-stone-800">{order.customerName}</span>
                              </div>
                              <div>
                                <span className="text-stone-400 uppercase font-bold tracking-wider text-[10px]">Phone:</span>{" "}
                                <span className="font-mono font-bold text-[#1A1A1A]">{order.contactNumber}</span>
                              </div>
                              <div className="truncate">
                                <span className="text-stone-400 uppercase font-bold tracking-wider text-[10px]">Address:</span>{" "}
                                <span className="text-stone-800 font-medium">{order.deliveryAddress}</span>
                              </div>
                            </div>

                            {/* Order details summary list */}
                            <div className="mt-4 pt-3 border-t border-dashed border-stone-200">
                              <h5 className="text-[9px] font-black uppercase tracking-wider text-[#FF6B35] mb-1.5">Ordered Items</h5>
                              <ul className="space-y-1 text-xs font-bold uppercase">
                                {order.items.map((it, i) => (
                                  <li key={i} className="flex justify-between">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-mono text-[#1A1A1A]">₹{it.total}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A] space-y-3">
                            <div className="flex justify-between items-center text-xs font-black uppercase">
                              <span>Payable Total:</span>
                              <span className="font-mono font-black text-lg text-[#FF6B35]">₹{order.finalTotal}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                onClick={() => handleUpdateStatus(order.id, "ACCEPTED")}
                                className="w-full bg-[#1A1A1A] hover:bg-[#FF6B35] text-white hover:text-[#1A1A1A] font-black py-2 text-[10px] uppercase tracking-wider transition border-2 border-[#1A1A1A]"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(order.id, "REJECTED")}
                                className="w-full bg-red-100 hover:bg-red-200 text-red-800 font-black py-2 text-[10px] uppercase tracking-wider transition border-2 border-red-800"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All other orders */}
                <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                  <h3 className="font-sans font-black text-xl text-[#1A1A1A] border-b-4 border-[#1A1A1A] pb-3 mb-6 uppercase tracking-tight">
                    Order Registers
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-bold">
                      <thead>
                        <tr className="bg-[#F7F7F2] text-[#1A1A1A] uppercase tracking-widest text-[9px] border-b-2 border-[#1A1A1A]">
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Order ID</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Customer Name</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Delivery Info</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Dish List</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Total Payable</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Payment Info</th>
                          <th className="py-3 px-4 border-r-2 border-[#1A1A1A]">Order Status</th>
                          <th className="py-3 px-4 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-[#1A1A1A]">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/50 transition">
                            <td className="py-4 px-4 font-mono font-black border-r-2 border-[#1A1A1A] text-stone-800">{order.id}</td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A]">
                              <div className="font-black uppercase tracking-tight text-stone-900">{order.customerName}</div>
                              <div className="text-[10px] text-stone-400 font-mono mt-0.5">{order.contactNumber}</div>
                            </td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A]">
                              <div className="text-stone-800 max-w-xs truncate">{order.deliveryAddress}</div>
                              <div className="text-[10px] text-[#FF6B35] font-black uppercase mt-0.5">
                                Distance: {order.deliveryDistance} KM
                              </div>
                            </td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A] text-stone-600 max-w-xs truncate uppercase">
                              {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                            </td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A] font-mono font-black text-[#FF6B35] text-sm">
                              ₹{order.finalTotal}
                            </td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A]">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest w-max border ${
                                    order.paymentStatus === "PAID"
                                      ? "bg-green-100 text-green-800 border-green-300"
                                      : "bg-yellow-100 text-yellow-800 border-yellow-300"
                                  }`}
                                >
                                  {order.paymentStatus}
                                </span>
                                {order.paymentReference && (
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    Ref: {order.paymentReference}
                                  </span>
                                )}

                                {/* Mark as Paid */}
                                <select
                                  value={order.paymentStatus}
                                  onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as PaymentStatus)}
                                  className="text-[10px] mt-1.5 border-2 border-[#1A1A1A] bg-white p-1 font-black uppercase focus:outline-none focus:border-[#FF6B35]"
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="PAID">PAID</option>
                                  <option value="FAILED">FAILED</option>
                                </select>
                              </div>
                            </td>
                            <td className="py-4 px-4 border-r-2 border-[#1A1A1A]">
                              <select
                                value={order.orderStatus}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                                className={`font-black uppercase tracking-wider border-2 border-[#1A1A1A] p-1 text-[10px] focus:outline-none ${
                                  order.orderStatus === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : order.orderStatus === "ACCEPTED" || order.orderStatus === "PREPARING"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.orderStatus === "READY" || order.orderStatus === "OUT_FOR_DELIVERY"
                                    ? "bg-purple-100 text-purple-800"
                                    : order.orderStatus === "DELIVERED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="ACCEPTED">ACCEPTED</option>
                                <option value="REJECTED">REJECTED</option>
                                <option value="PREPARING">PREPARING</option>
                                <option value="READY">READY</option>
                                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                                <option value="DELIVERED">DELIVERED</option>
                              </select>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 py-1 bg-white hover:bg-stone-100 border-2 border-[#1A1A1A] font-black uppercase tracking-wider transition text-[9px] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                              >
                                Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================
               MENU MANAGEMENT TAB
               ================================== */}
            {activeTab === "menu" && (
              <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-[#1A1A1A] pb-4 mb-6">
                  <div>
                    <h3 className="font-sans font-black text-xl text-neutral-900 uppercase tracking-tight">
                      Restaurant Menu Items
                    </h3>
                    <p className="text-xs font-bold text-stone-500 uppercase mt-0.5">
                      Configure items, pricing, photos, and stock status
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setItemForm({
                        categoryId: categories[0]?.id || "",
                        name: "",
                        description: "",
                        price: 0,
                        availability: "IN_STOCK",
                        image: "",
                      });
                      setShowItemModal(true);
                    }}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#FF6B35] text-white hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black uppercase tracking-wider text-xs transition flex items-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Menu Item</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map((item) => {
                    const isOutOfStock = item.availability === "OUT_STOCK";
                    const cat = categories.find((c) => c.id === item.categoryId);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border-4 p-4 flex flex-col justify-between hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
                          isOutOfStock
                            ? "border-gray-200 opacity-60 bg-gray-50/50"
                            : "border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[9px] uppercase tracking-widest font-black bg-[#FF6B35]/20 text-[#FF6B35] px-2 py-0.5 border border-[#FF6B35]">
                              {cat?.name || "No Category"}
                            </span>
                            <button
                              onClick={() => toggleItemStock(item)}
                              className={`flex items-center gap-1 text-[10px] font-black uppercase ${
                                isOutOfStock ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              <span>{isOutOfStock ? "OUT OF STOCK" : "IN STOCK"}</span>
                              {isOutOfStock ? (
                                <ToggleLeft className="w-5 h-5 text-[#1A1A1A]" />
                              ) : (
                                <ToggleRight className="w-5 h-5 text-[#1A1A1A]" />
                              )}
                            </button>
                          </div>

                          <div className="flex gap-4">
                            {/* Base64 menu image */}
                            <div className="w-16 h-16 rounded-none bg-stone-100 border-2 border-[#1A1A1A] flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl">🍲</span>
                              )}
                            </div>

                            <div className="flex-1">
                              <h4 className="font-black text-stone-900 text-sm uppercase tracking-tight">{item.name}</h4>
                              <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                                {item.description || "Freshly prepared delicacies."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t-2 border-dashed border-stone-200 flex items-center justify-between">
                          <span className="font-sans font-black text-base text-[#FF6B35]">₹{item.price}</span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({
                                  categoryId: item.categoryId,
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  availability: item.availability,
                                  image: item.image || "",
                                });
                                setShowItemModal(true);
                              }}
                              className="p-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-none border-2 border-[#1A1A1A]"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-none border-2 border-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================================
               CATEGORIES TAB
               ================================== */}
            {activeTab === "categories" && (
              <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] max-w-xl mx-auto">
                <div className="flex justify-between items-center border-b-4 border-[#1A1A1A] pb-4 mb-6">
                  <div>
                    <h3 className="font-sans font-black text-xl text-neutral-900 uppercase tracking-tight">
                      Menu Categories
                    </h3>
                    <p className="text-xs font-bold text-stone-500 uppercase mt-0.5">
                      Configure global taxonomy indices
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryNameForm("");
                      setShowCategoryModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#1A1A1A] text-white font-black text-xs uppercase tracking-wider border-2 border-[#1A1A1A]"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    <span>Add New</span>
                  </button>
                </div>

                <div className="divide-y-2 divide-[#1A1A1A]">
                  {categories.map((cat) => {
                    const itemsCount = menuItems.filter((i) => i.categoryId === cat.id).length;
                    return (
                      <div key={cat.id} className="py-3.5 flex justify-between items-center text-xs font-bold uppercase">
                        <div>
                          <div className="font-black text-[#1A1A1A] tracking-tight">{cat.name}</div>
                          <div className="text-stone-400 mt-0.5 font-sans text-[10px]">{itemsCount} dishes attached</div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryNameForm(cat.name);
                              setShowCategoryModal(true);
                            }}
                            className="p-1.5 bg-white hover:bg-stone-50 border-2 border-[#1A1A1A]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 bg-white hover:bg-red-50 border-2 border-red-600 text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================================
               STORE SETTINGS TAB
               ================================== */}
            {activeTab === "settings" && (
              <div className="bg-white border-4 border-[#1A1A1A] p-6 max-w-2xl mx-auto shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="font-sans font-black text-xl text-neutral-900 border-b-4 border-[#1A1A1A] pb-3 mb-6 uppercase tracking-tight">
                  MASALA EXPRESS Settings &amp; Billing Rates
                </h3>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* UPI Details */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 border-b-2 border-stone-100 pb-1.5">
                        Merchant UPI Config (Instants)
                      </h4>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">UPI Name / Merchant Name</label>
                        <input
                          type="text"
                          value={settingsForm.upiName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, upiName: e.target.value })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-stone-800"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">UPI ID</label>
                        <input
                          type="text"
                          value={settingsForm.upiId}
                          onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-mono font-black text-[#1A1A1A]"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Custom QR Base64 Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "settings")}
                          className="w-full text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-2 file:border-[#1A1A1A] file:text-xs file:font-black file:bg-stone-50"
                        />
                        {settingsForm.upiQrBase64 && (
                          <div className="mt-2 w-28 h-28 border-2 border-[#1A1A1A] p-1 bg-white">
                            <img src={settingsForm.upiQrBase64} alt="Custom UPI QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Taxes & Deliveries */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 border-b-2 border-stone-100 pb-1.5">
                        Tax &amp; Delivery Parameters
                      </h4>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Government GST (%)</label>
                        <input
                          type="number"
                          value={settingsForm.gstRate}
                          onChange={(e) => setSettingsForm({ ...settingsForm, gstRate: Number(e.target.value) })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-[#FF6B35]"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Delivery Fee per KM (₹)</label>
                        <input
                          type="number"
                          value={settingsForm.deliveryRatePerKm}
                          onChange={(e) => setSettingsForm({ ...settingsForm, deliveryRatePerKm: Number(e.target.value) })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35]"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Maximum Delivery Charge (₹)</label>
                        <input
                          type="number"
                          value={settingsForm.maxDeliveryCharge}
                          onChange={(e) => setSettingsForm({ ...settingsForm, maxDeliveryCharge: Number(e.target.value) })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t-2 border-[#1A1A1A]">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 border-b-2 border-stone-100 pb-1.5">
                      Store Contact Information
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Phone Number</label>
                        <input
                          type="text"
                          value={settingsForm.restaurantPhone}
                          onChange={(e) => setSettingsForm({ ...settingsForm, restaurantPhone: e.target.value })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35]"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs font-bold uppercase">
                        <label className="block text-stone-500">Address Details</label>
                        <input
                          type="text"
                          value={settingsForm.restaurantAddress}
                          onChange={(e) => setSettingsForm({ ...settingsForm, restaurantAddress: e.target.value })}
                          className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1A1A1A] hover:bg-[#FF6B35] text-white hover:text-[#1A1A1A] border-4 border-[#1A1A1A] py-3.5 font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    Save Configuration Changes
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================================
         ORDER DETAIL RECEIPT MODAL
         ================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-none border-4 border-[#1A1A1A] max-w-md w-full overflow-hidden shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between">
            <div className="p-6">
              <div className="flex justify-between items-start border-b-4 border-[#1A1A1A] pb-3 mb-4">
                <div>
                  <div className="text-[9px] text-stone-400 uppercase tracking-widest font-black">Invoice Statement</div>
                  <div className="font-mono font-black text-stone-950 text-sm">{selectedOrder.id}</div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-[#1A1A1A]" />
                </button>
              </div>

              {/* Status Update Selectors */}
              <div className="bg-[#F7F7F2] p-3.5 border-2 border-[#1A1A1A] mb-4 space-y-2">
                <div className="text-[9px] font-black text-[#1A1A1A] uppercase tracking-wider">Configure Lifecycle &amp; Payment</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="text-[11px] bg-white border-2 border-[#1A1A1A] px-2 py-1 font-black uppercase focus:outline-none focus:border-[#FF6B35]"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="READY">READY</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>

                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)}
                    className="text-[11px] bg-white border-2 border-[#1A1A1A] px-2 py-1 font-black uppercase focus:outline-none focus:border-[#FF6B35]"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="text-xs space-y-2 mb-4 border-b-2 border-stone-200 pb-3 font-bold uppercase">
                <div className="flex justify-between">
                  <span className="text-stone-400">Customer Name:</span>
                  <span className="font-black text-stone-900">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Contact Mobile:</span>
                  <span className="font-black font-mono text-stone-900">{selectedOrder.contactNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block mb-0.5">Address:</span>
                  <span className="font-bold text-stone-900 block bg-[#F7F7F2] px-2.5 py-1.5 border border-[#1A1A1A]">
                    {selectedOrder.deliveryAddress}
                  </span>
                </div>
                {selectedOrder.paymentReference && (
                  <div className="p-2.5 bg-green-50 border-2 border-green-600 text-green-800 font-black">
                    <span className="text-[9px] uppercase block text-stone-500">Submitted UTR Reference</span>
                    <span className="font-mono text-xs">{selectedOrder.paymentReference}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs border-b-2 border-stone-200 pb-3 mb-3 max-h-40 overflow-y-auto font-bold uppercase">
                <div className="text-[9px] uppercase font-black text-stone-400 mb-1">Items Included</div>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-stone-700">
                    <span>
                      {item.name} <span className="font-mono text-stone-400">x{item.quantity}</span>
                    </span>
                    <span className="font-mono">₹{item.total}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-xs font-bold uppercase text-stone-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-stone-700">₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({selectedOrder.gstPercent}%)</span>
                  <span className="font-mono text-stone-700">₹{selectedOrder.gstAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge ({selectedOrder.deliveryDistance} KM)</span>
                  <span className="font-mono text-stone-700">₹{selectedOrder.deliveryCharge}</span>
                </div>
                {selectedOrder.roundOff !== 0 && (
                  <div className="flex justify-between text-[#FF6B35] italic">
                    <span>Round-Off</span>
                    <span>₹{selectedOrder.roundOff}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-stone-950 border-t-2 border-[#1A1A1A] pt-2">
                  <span>Net Paid Amount</span>
                  <span className="text-[#FF6B35] font-mono">₹{selectedOrder.finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F7F2] p-4 border-t-2 border-[#1A1A1A] text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] font-black uppercase text-xs hover:bg-white hover:text-[#1A1A1A] transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================
         CATEGORY ADD / EDIT MODAL
         ================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-none border-4 border-[#1A1A1A] max-w-sm w-full p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
            <div className="flex justify-between items-center border-b-2 border-stone-100 pb-3 mb-4">
              <h4 className="font-sans font-black text-lg text-neutral-900 uppercase tracking-tight">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h4>
              <button onClick={() => setShowCategoryModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 font-bold uppercase">
              <div className="space-y-1.5 text-xs">
                <label className="block text-stone-500">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryNameForm}
                  onChange={(e) => setCategoryNameForm(e.target.value)}
                  className="w-full bg-stone-50 px-3 py-2 border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-stone-900"
                  placeholder="e.g. SOUPS, STARTERS"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs uppercase tracking-wider transition"
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================
         MENU ITEM ADD / EDIT MODAL
         ================================== */}
      {showItemModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-none border-4 border-[#1A1A1A] max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-4 border-stone-100 pb-3 mb-4">
              <h4 className="font-sans font-black text-lg text-neutral-900 uppercase tracking-tight">
                {editingItem ? "Edit Menu Item" : "Create Menu Item"}
              </h4>
              <button onClick={() => setShowItemModal(false)} className="text-[#1A1A1A] hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 font-bold uppercase">
              <div className="space-y-1 text-xs">
                <label className="block text-stone-500">Category</label>
                <select
                  required
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-stone-800"
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-stone-500">Dish Title / Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-stone-900"
                  placeholder="GARLIC MUSHROOM FRY"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-stone-500">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full bg-stone-50 px-3 py-2 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] text-[#1A1A1A]"
                  placeholder="Sauteed with fresh button mushrooms and garlic butter."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <label className="block text-stone-500">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black text-[#FF6B35]"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-stone-500">Availability</label>
                  <select
                    value={itemForm.availability}
                    onChange={(e) => setItemForm({ ...itemForm, availability: e.target.value as any })}
                    className="w-full bg-stone-50 px-3 py-2.5 rounded-none border-2 border-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] font-black"
                  >
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="OUT_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-stone-500">Dish Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "item")}
                  className="w-full text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-2 file:border-[#1A1A1A] file:text-xs file:font-black file:bg-stone-50"
                />
                {itemForm.image && (
                  <div className="mt-2 w-20 h-20 border-2 border-[#1A1A1A] p-0.5 bg-white">
                    <img src={itemForm.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs uppercase tracking-wider transition shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
              >
                {editingItem ? "Update Dish Info" : "Add Dish To Catalog"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
