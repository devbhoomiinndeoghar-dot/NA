import { User, MenuCategory, MenuItem, Order, RestaurantSettings, PaymentStatus, OrderStatus } from "./types";

const API_BASE = "/api";

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("masala_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, "passwordHash"> }> {
    const data = await request<{ token: string; user: Omit<User, "passwordHash"> }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("masala_token", data.token);
    return data;
  },

  async register(params: Omit<User, "id" | "role" | "passwordHash"> & { password: string }): Promise<{ token: string; user: Omit<User, "passwordHash"> }> {
    const data = await request<{ token: string; user: Omit<User, "passwordHash"> }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
    localStorage.setItem("masala_token", data.token);
    return data;
  },

  async getMe(): Promise<{ user: Omit<User, "passwordHash"> }> {
    return request<{ user: Omit<User, "passwordHash"> }>("/auth/me");
  },

  async updateProfile(params: { name?: string; contactNumber?: string; deliveryAddress?: string }): Promise<{ user: Omit<User, "passwordHash"> }> {
    return request<{ user: Omit<User, "passwordHash"> }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(params),
    });
  },

  logout() {
    localStorage.removeItem("masala_token");
  },

  // Menu
  async getCategories(): Promise<MenuCategory[]> {
    return request<MenuCategory[]>("/menu/categories");
  },

  async getMenuItems(): Promise<MenuItem[]> {
    return request<MenuItem[]>("/menu/items");
  },

  // Settings
  async getSettings(): Promise<RestaurantSettings> {
    return request<RestaurantSettings>("/settings");
  },

  // Orders
  async createOrder(params: {
    customerName: string;
    contactNumber: string;
    deliveryAddress: string;
    deliveryDistance: number;
    items: { itemId: string; name: string; quantity: number }[];
  }): Promise<Order> {
    return request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async getOrders(): Promise<Order[]> {
    return request<Order[]>("/orders");
  },

  async getOrder(id: string): Promise<Order> {
    return request<Order>(`/orders/${id}`);
  },

  async submitPayment(orderId: string, paymentReference: string): Promise<{ success: boolean; order: Order }> {
    return request<{ success: boolean; order: Order }>(`/orders/${orderId}/payment`, {
      method: "POST",
      body: JSON.stringify({ paymentReference }),
    });
  },

  // Admin Categories
  async createCategory(name: string): Promise<MenuCategory> {
    return request<MenuCategory>("/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async updateCategory(id: string, name: string): Promise<MenuCategory> {
    return request<MenuCategory>(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/categories/${id}`, {
      method: "DELETE",
    });
  },

  // Admin Items
  async createMenuItem(item: Omit<MenuItem, "id">): Promise<MenuItem> {
    return request<MenuItem>("/admin/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async updateMenuItem(id: string, item: Partial<MenuItem>): Promise<MenuItem> {
    return request<MenuItem>(`/admin/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  async deleteMenuItem(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/items/${id}`, {
      method: "DELETE",
    });
  },

  // Admin Settings
  async updateSettings(settings: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
    return request<RestaurantSettings>("/admin/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  },

  // Admin Order Status
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return request<Order>(`/admin/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  // Admin Order Payment
  async updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order> {
    return request<Order>(`/admin/orders/${orderId}/payment`, {
      method: "POST",
      body: JSON.stringify({ paymentStatus }),
    });
  },
};
