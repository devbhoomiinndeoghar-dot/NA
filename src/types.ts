export type UserRole = "CUSTOMER" | "RESTAURANT_ADMIN";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  contactNumber: string;
  deliveryAddress: string;
  role: UserRole;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  availability: "IN_STOCK" | "OUT_STOCK";
  image?: string; // base64 or placeholder image url
}

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  contactNumber: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  deliveryDistance: number;
  deliveryCharge: number;
  roundOff: number;
  finalTotal: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  estimatedPrepTime?: string;
  paymentReference?: string;
}

export interface RestaurantSettings {
  upiId: string;
  upiName: string;
  upiQrBase64?: string;
  gstRate: number; // default 5%
  deliveryRatePerKm: number; // default 50
  maxDeliveryCharge: number; // default 100
  restaurantAddress: string;
  restaurantPhone: string;
}
