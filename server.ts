import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Database, hashPassword } from "./server/db";
import { User, MenuItem, Order, OrderItem, RestaurantSettings } from "./src/types";

// Initialize local JSON file-based database
Database.initialize();

const app = express();
const PORT = 3000;

// Increase body limit to allow Base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Sessions Store (In-Memory)
const sessions = new Map<string, { userId: string; email: string; role: string }>();

// Auth Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(403).json({ error: "Invalid or expired session" });
  }

  (req as any).user = session;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "RESTAURANT_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }
  next();
}

// --- AUTH API ---

// Register Customer
app.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const { name, email, password, contactNumber, deliveryAddress } = req.body;

    if (!name || !email || !password || !contactNumber || !deliveryAddress) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const users = Database.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const newUser: User = {
      id: "cust-" + Date.now().toString(36),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      contactNumber,
      deliveryAddress,
      role: "CUSTOMER",
    };

    Database.saveUser(newUser);

    // Auto login after registration
    const token = crypto.randomUUID();
    sessions.set(token, { userId: newUser.id, email: newUser.email, role: newUser.role });

    const { passwordHash, ...userResponse } = newUser;
    res.status(201).json({ token, user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login (Customer or Admin)
app.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = Database.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = crypto.randomUUID();
    sessions.set(token, { userId: user.id, email: user.email, role: user.role });

    const { passwordHash, ...userResponse } = user;
    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile
app.get("/api/auth/me", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const users = Database.getUsers();
    const user = users.find((u) => u.id === session.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { passwordHash, ...userResponse } = user;
    res.json({ user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Customer Profile Details
app.put("/api/auth/profile", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const { name, contactNumber, deliveryAddress } = req.body;

    const users = Database.getUsers();
    const user = users.find((u) => u.id === session.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (contactNumber) user.contactNumber = contactNumber;
    if (deliveryAddress) user.deliveryAddress = deliveryAddress;

    Database.saveUser(user);

    const { passwordHash, ...userResponse } = user;
    res.json({ user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- MENU API ---

// Get Categories
app.get("/api/menu/categories", (req: Request, res: Response) => {
  res.json(Database.getCategories());
});

// Get Menu Items
app.get("/api/menu/items", (req: Request, res: Response) => {
  res.json(Database.getMenuItems());
});


// --- ADMIN MANAGE CATEGORIES & ITEMS ---

app.post("/api/admin/categories", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const id = "cat-" + Date.now().toString(36);
    const newCategory = { id, name };
    Database.saveCategory(newCategory);
    res.status(201).json(newCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/categories/:id", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const category = { id, name };
    Database.saveCategory(category);
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/categories/:id", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    Database.deleteCategory(id);
    res.json({ success: true, message: "Category and associated items deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Menu Item
app.post("/api/admin/items", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { categoryId, name, description, price, availability, image } = req.body;

    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ error: "Category, name and price are required" });
    }

    const newItem: MenuItem = {
      id: "item-" + Date.now().toString(36),
      categoryId,
      name,
      description: description || "",
      price: Number(price),
      availability: availability || "IN_STOCK",
      image: image || "",
    };

    Database.saveMenuItem(newItem);
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Menu Item
app.put("/api/admin/items/:id", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, price, availability, image } = req.body;

    const items = Database.getMenuItems();
    const existing = items.find((i) => i.id === id);
    if (!existing) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    if (categoryId) existing.categoryId = categoryId;
    if (name) existing.name = name;
    if (description !== undefined) existing.description = description;
    if (price !== undefined) existing.price = Number(price);
    if (availability) existing.availability = availability;
    if (image !== undefined) existing.image = image;

    Database.saveMenuItem(existing);
    res.json(existing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Menu Item
app.delete("/api/admin/items/:id", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    Database.deleteMenuItem(id);
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- RESTAURANT SETTINGS ---

app.get("/api/settings", (req: Request, res: Response) => {
  res.json(Database.getSettings());
});

app.post("/api/admin/settings", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { upiId, upiName, upiQrBase64, gstRate, deliveryRatePerKm, maxDeliveryCharge, restaurantAddress, restaurantPhone } = req.body;

    const settings = Database.getSettings();

    if (upiId !== undefined) settings.upiId = upiId;
    if (upiName !== undefined) settings.upiName = upiName;
    if (upiQrBase64 !== undefined) settings.upiQrBase64 = upiQrBase64;
    if (gstRate !== undefined) settings.gstRate = Number(gstRate);
    if (deliveryRatePerKm !== undefined) settings.deliveryRatePerKm = Number(deliveryRatePerKm);
    if (maxDeliveryCharge !== undefined) settings.maxDeliveryCharge = Number(maxDeliveryCharge);
    if (restaurantAddress !== undefined) settings.restaurantAddress = restaurantAddress;
    if (restaurantPhone !== undefined) settings.restaurantPhone = restaurantPhone;

    Database.saveSettings(settings);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- CUSTOMER ORDERS API ---

// Create Order (Calculated & Validated Server-Side for security)
app.post("/api/orders", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const { items: cartItems, deliveryDistance, contactNumber, deliveryAddress, customerName } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart cannot be empty" });
    }
    if (deliveryDistance === undefined || deliveryDistance < 0) {
      return res.status(400).json({ error: "Valid delivery distance is required" });
    }
    if (!deliveryAddress || !contactNumber || !customerName) {
      return res.status(400).json({ error: "Delivery address and contact details are required" });
    }

    const menuItems = Database.getMenuItems();
    const settings = Database.getSettings();

    // Verify stock and calculate server-side totals to prevent client manipulation
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of cartItems) {
      const match = menuItems.find((m) => m.id === item.itemId);
      if (!match) {
        return res.status(400).json({ error: `Item not found: ${item.name}` });
      }
      if (match.availability === "OUT_STOCK") {
        return res.status(400).json({ error: `Sorry, ${match.name} is currently out of stock` });
      }

      const itemTotal = match.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        itemId: match.id,
        name: match.name,
        price: match.price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    // 5% GST (or configured gstRate)
    const gstRatePercent = settings.gstRate || 5;
    const gstAmount = Math.round((subtotal * (gstRatePercent / 100)) * 100) / 100;

    // Delivery charges based on distance
    const ratePerKm = settings.deliveryRatePerKm || 50;
    const maxCharge = settings.maxDeliveryCharge || 100;
    let deliveryCharge = deliveryDistance * ratePerKm;
    if (deliveryCharge > maxCharge) {
      deliveryCharge = maxCharge;
    }
    deliveryCharge = Math.round(deliveryCharge * 100) / 100;

    // Calculate gross total
    const grossTotal = subtotal + gstAmount + deliveryCharge;

    // Nearest whole rupee round-off
    const finalTotal = Math.round(grossTotal);
    const roundOff = Math.round((finalTotal - grossTotal) * 100) / 100;

    const orderId = "ME-" + Date.now().toString(10).slice(-6) + Math.floor(100 + Math.random() * 900);

    const newOrder: Order = {
      id: orderId,
      customerId: session.userId,
      customerName,
      contactNumber,
      deliveryAddress,
      items: orderItems,
      subtotal,
      gstPercent: gstRatePercent,
      gstAmount,
      deliveryDistance,
      deliveryCharge,
      roundOff,
      finalTotal,
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
      createdAt: new Date().toISOString(),
    };

    Database.saveOrder(newOrder);
    res.status(201).json(newOrder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get own orders
app.get("/api/orders", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const orders = Database.getOrders();

    if (session.role === "RESTAURANT_ADMIN") {
      // Admin sees all orders
      return res.json(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      // Customer sees only own orders
      const userOrders = orders.filter((o) => o.customerId === session.userId);
      res.json(userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Track specific order
app.get("/api/orders/:id", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const { id } = req.params;

    const orders = Database.getOrders();
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Protection check
    if (session.role !== "RESTAURANT_ADMIN" && order.customerId !== session.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Post payment reference (Customer)
app.post("/api/orders/:id/payment", authenticateToken, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const { id } = req.params;
    const { paymentReference } = req.body;

    if (!paymentReference) {
      return res.status(400).json({ error: "Payment reference is required" });
    }

    const orders = Database.getOrders();
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.customerId !== session.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    order.paymentReference = paymentReference;
    // Keep modular and simulate payment review, we don't automatically mark as paid
    // until admin verifies or a real gateway verifies.
    Database.saveOrder(order);

    res.json({ success: true, order, message: "Payment details submitted for verification" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- ADMIN ORDER MANAGEMENT ---

// Update Order Status
app.post("/api/admin/orders/:id/status", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["PENDING", "ACCEPTED", "REJECTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const orders = Database.getOrders();
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.orderStatus = status;

    const now = new Date().toISOString();
    if (status === "ACCEPTED") {
      order.acceptedAt = now;
      order.estimatedPrepTime = "30–40 minutes";
    } else if (status === "REJECTED") {
      order.rejectedAt = now;
    }

    Database.saveOrder(order);
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Payment Status (Verified by Admin)
app.post("/api/admin/orders/:id/payment", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const allowedPaymentStatuses = ["PENDING", "PAID", "FAILED"];
    if (!paymentStatus || !allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    const orders = Database.getOrders();
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    Database.saveOrder(order);

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- INTEGRATE VITE & STATIC SERVING ---

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving from compiled dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
