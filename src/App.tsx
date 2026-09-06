import React, { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { api } from "./api";
import { CustomerView } from "./components/CustomerView";
import { AdminView } from "./components/AdminView";
import { Logo } from "./components/Logo";
import { Lock, Mail, User as UserIcon, Phone, MapPin, Key, ArrowLeft, RefreshCw, AlertCircle, Info, ArrowRight } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<"customer" | "admin" | "login" | "register" | "admin-login">("customer");
  const [user, setUser] = useState<Omit<User, "passwordHash"> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);

  // Verify session on start
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("masala_token");
      if (token) {
        const res = await api.getMe();
        setUser(res.user);
        if (res.user.role === "RESTAURANT_ADMIN") {
          setCurrentView("admin");
        } else {
          setCurrentView("customer");
        }
      } else {
        setCurrentView("customer");
      }
    } catch (err) {
      console.error("No active session or invalid token");
      localStorage.removeItem("masala_token");
      setCurrentView("customer");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView("customer");
  };

  const handleLogin = async (e: React.FormEvent, forceRole?: UserRole) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setAuthError(null);
      const res = await api.login(email, password);
      setUser(res.user);

      // Reset fields
      setEmail("");
      setPassword("");

      if (res.user.role === "RESTAURANT_ADMIN") {
        setCurrentView("admin");
      } else {
        setCurrentView("customer");
      }
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !contactNumber || !deliveryAddress) {
      setAuthError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);
      const res = await api.register({
        email,
        password,
        name,
        contactNumber,
        deliveryAddress,
      });
      setUser(res.user);

      // Reset fields
      setEmail("");
      setPassword("");
      setName("");
      setContactNumber("");
      setDeliveryAddress("");

      setCurrentView("customer");
    } catch (err: any) {
      setAuthError(err.message || "Registration failed. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f6efe0] min-h-screen flex flex-col items-center justify-center">
        <Logo size="md" className="mb-6 animate-pulse" />
        <RefreshCw className="w-8 h-8 text-[#b8862f] animate-spin mb-2" />
        <span className="font-semibold text-stone-600 text-sm tracking-wider">
          Brewing delicious flavors...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6efe0] flex flex-col justify-between">
      {/* Dynamic Views Controller */}
      <div className="flex-1 flex flex-col">
        {currentView === "customer" && (
          <CustomerView
            user={user}
            onLogout={handleLogout}
            onNavigateToLogin={() => {
              setAuthError(null);
              setCurrentView("login");
            }}
          />
        )}

        {currentView === "admin" && (
          <AdminView user={user} onLogout={handleLogout} />
        )}

        {/* Auth Screens */}
        {(currentView === "login" || currentView === "admin-login" || currentView === "register") && (
          <div className="flex-1 flex items-center justify-center px-4 py-12 bg-neutral-950 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#b8862f]/10 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#7a1f2b]/15 blur-3xl" />

            <div className="max-w-md w-full bg-stone-900 border border-[#b8862f]/25 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-stone-100">
              <div className="flex flex-col items-center mb-6">
                <Logo size="sm" className="mb-3" />
                <h2 className="font-serif font-bold text-xl text-[#b8862f] tracking-wide">
                  {currentView === "login"
                    ? "Customer Sign In"
                    : currentView === "admin-login"
                    ? "Restaurant Admin Sign In"
                    : "Create Customer Account"}
                </h2>
                <p className="text-[11px] text-stone-400 mt-1">
                  {currentView === "login"
                    ? "Browse & order high quality delicacies"
                    : currentView === "admin-login"
                    ? "Control incoming orders and live menus"
                    : "Join Masala Express for fast doorstep delivery"}
                </p>
              </div>

              {authError && (
                <div className="p-3.5 bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold rounded-xl mb-6 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Core Forms */}
              {currentView === "register" ? (
                /* CUSTOMER SIGN UP FORM */
                <form onSubmit={handleRegister} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Your Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                        <input
                          type="email"
                          required
                          placeholder="rahul@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 7903494035"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Delivery Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                      <input
                        type="text"
                        required
                        placeholder="House, street, landmark, city"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Secure Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#b8862f] hover:bg-[#a07425] text-stone-950 font-bold py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer mt-4"
                  >
                    Create Account
                  </button>
                </form>
              ) : (
                /* LOGIN FORMS (Customer or Admin) */
                <form onSubmit={handleLogin} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. customer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Your Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[#b8862f]/70" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-stone-950 pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-[#b8862f] text-stone-100"
                      />
                    </div>
                  </div>

                  {/* Testing Helper Widget for Devs */}
                  {currentView === "admin-login" && (
                    <div className="p-3 bg-[#b8862f]/10 border border-[#b8862f]/20 rounded-2xl space-y-1 text-[11px] text-[#b8862f]/90 mt-2">
                      <div className="font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Demo Admin Login Credentials:</span>
                      </div>
                      <div>
                        Email: <span className="font-mono font-bold select-all text-white">admin@masalaexpress.com</span>
                      </div>
                      <div>
                        Password: <span className="font-mono font-bold select-all text-white">adminpassword</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#b8862f] hover:bg-[#a07425] text-stone-950 font-bold py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer mt-4"
                  >
                    Authenticate Session
                  </button>
                </form>
              )}

              {/* Toggle links */}
              <div className="mt-6 pt-4 border-t border-stone-800/60 text-center text-xs space-y-3 text-stone-400">
                {currentView === "login" && (
                  <div>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setCurrentView("register");
                      }}
                      className="text-[#b8862f] font-semibold hover:underline"
                    >
                      Sign Up Now
                    </button>
                  </div>
                )}

                {currentView === "register" && (
                  <div>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setCurrentView("login");
                      }}
                      className="text-[#b8862f] font-semibold hover:underline"
                    >
                      Login Here
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 text-[11px]">
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setCurrentView("customer");
                    }}
                    className="flex items-center gap-1 text-stone-400 hover:text-white"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Menu</span>
                  </button>

                  {currentView !== "admin-login" ? (
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setCurrentView("admin-login");
                      }}
                      className="text-[#b8862f]/80 hover:text-[#b8862f] font-semibold"
                    >
                      Restaurant Admin Panel &rarr;
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setCurrentView("login");
                      }}
                      className="text-[#b8862f]/80 hover:text-[#b8862f] font-semibold"
                    >
                      Customer Login Portal &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-[#b8862f]/20 py-8 px-4 text-center">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
            <div className="text-left space-y-1">
              <div className="font-serif font-bold text-[#b8862f] text-sm tracking-wider">MASALA EXPRESS — Hotel Devbhoomi Inn</div>
              <div>At- V Bazar, Barfani Tower, H.K Banerjee Road, Near Old Bus Stand, Deoghar, Jharkhand 814112</div>
              <div>📞 Phone: +91 7903494035 | ✉️ Support: devbhoomiinndeoghar@gmail.com</div>
            </div>

            <div className="flex gap-4">
              {currentView !== "admin" && (
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentView(user?.role === "RESTAURANT_ADMIN" ? "admin" : "admin-login");
                  }}
                  className="text-stone-400 hover:text-[#b8862f] transition font-semibold"
                >
                  Restaurant Admin Access
                </button>
              )}
            </div>
          </div>

          <div className="text-[10px] text-stone-500 pt-4 border-t border-stone-800">
            &copy; {new Date().getFullYear()} Masala Express. All Rights Reserved. Production-ready web app &amp; PWA.
          </div>
        </div>
      </footer>
    </div>
  );
}
