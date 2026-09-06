# MASALA EXPRESS — Full-Stack PWA Food Ordering System
*Hotel Devbhoomi Inn, Deoghar, Jharkhand*

MASALA EXPRESS is a high-performance, full-stack responsive Progressive Web App (PWA) and food ordering system. Built with **React 19**, **Vite**, **TypeScript**, and **Express**, it offers separate customer and restaurant admin experiences, real-time-like order tracking, secure server-side billing calculations, and a fully customizable local JSON database.

---

## 📱 Mobile APK Build Instructions (Capacitor)
You can easily package this web application into a high-performance Android APK using **CapacitorJS**. Follow these steps to build the APK:

### Prerequisite Dependencies
Make sure you have **Node.js**, **Android Studio**, and **Java SDK (JDK 17)** installed on your developer machine.

### Step-by-Step Package Commands:
1. **Initialize Capacitor:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "MASALA EXPRESS" "com.devbhoomi.masalaexpress" --web-dir=dist
   ```

2. **Add Android Platform:**
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```

3. **Build the Production Web App:**
   ```bash
   npm run build
   ```

4. **Sync Web Code into the Android Project:**
   ```bash
   npx cap sync
   ```

5. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

6. **Generate APK / Signed Bundle:**
   - In Android Studio, go to: `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - Your built APK will be ready at: `android/app/build/outputs/apk/debug/app-debug.apk`!

---

## 🛠️ Setup & Local Install Instructions

To run this full-stack application on your own local environment:

### 1. Extract and Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root folder (or duplicate `.env.example`):
```env
PORT=3000
GEMINI_API_KEY="your_api_key_here"
```

### 3. Run Development Server
This boots up the custom Express API backend proxied with the Vite hot-reloading dev server:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build & Start in Production Mode
```bash
npm run build
npm start
```

---

## 🗄️ Database Schema Representation
This application uses a server-side, file-persisted JSON database (`data/db.json`) implementing custom transactional logic. Below is the structural representation of the collections:

### 1. `Users`
Stores registrations and admin login handles. Passwords are encrypted on the server with secure **SHA-256** hashing.
```typescript
interface User {
  id: string;          // e.g., "cust-krdfh83j" or "admin-1"
  email: string;       // Unique registration email (lowercase)
  passwordHash: string;// Secure SHA-256 string
  name: string;        // Full name
  contactNumber: string;// 10-digit mobile number
  deliveryAddress: string;// Full delivery address
  role: "CUSTOMER" | "RESTAURANT_ADMIN";
}
```

### 2. `Menu Categories`
Holds the customizable categories used in the menu taxonomy.
```typescript
interface MenuCategory {
  id: string;          // e.g. "cat-breakfast"
  name: string;        // e.g. "Breakfast"
}
```

### 3. `Menu Items`
Catalog of dishes containing price parameters and in-stock toggles.
```typescript
interface MenuItem {
  id: string;          // Unique dish code
  categoryId: string;  // Connected category
  name: string;        // Title of the dish
  description: string; // Ingredients / details
  price: number;       // Base price (INR)
  availability: "IN_STOCK" | "OUT_STOCK";
  image?: string;      // Base64-encoded image string
}
```

### 4. `Orders`
Full customer receipt metadata, tracking estimates, and payment validations.
```typescript
interface Order {
  id: string;               // e.g. "ME-128493"
  customerId: string;
  customerName: string;
  contactNumber: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;         // Sum of matching items on server
  gstPercent: number;       // e.g. 5%
  gstAmount: number;        // subtotal * gstPercent
  deliveryDistance: number; // Selected KM
  deliveryCharge: number;   // Calculated on server (₹50/KM, max ₹100)
  roundOff: number;         // Auto-applied nearest whole rupee diff
  finalTotal: number;       // Final rounded amount (Whole integer)
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  orderStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED";
  createdAt: string;        // ISO format
  acceptedAt?: string;
  rejectedAt?: string;
  estimatedPrepTime?: string;// e.g. "30–40 minutes" when accepted
  paymentReference?: string;// UPI Transaction UTR submitted by client
}

interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}
```

### 5. `Restaurant Settings`
Governs billing, distance pricing thresholds, and configurable UPI codes.
```typescript
interface RestaurantSettings {
  upiId: string;            // UPI address (Default: "7903494035@upi")
  upiName: string;          // Business Name (Default: "MASALA EXPRESS")
  upiQrBase64?: string;     // Base64 custom uploaded merchant QR
  gstRate: number;          // Default 5%
  deliveryRatePerKm: number;// Default 50
  maxDeliveryCharge: number;// Default 100
  restaurantAddress: string;// Default "Barfani Tower, Deoghar"
  restaurantPhone: string;  // Default "7903494035"
}
```

---

## 🔐 Advanced Security Features
1. **Server-Side Verification:** Cart items, pricing, distance charges, and tax metrics are validated strictly on the Express backend before compiling the order, preventing any malicious price manipulations from client DevTools.
2. **SHA-256 Password Cryptography:** Passwords are never stored in raw text, adhering to strict authentication security guidelines.
3. **Session Guards:** Client tokens are generated uniquely per-session. Customer resources cannot be accessed or manipulated by other users. Admin actions are protected behind strict server-side middleware.
