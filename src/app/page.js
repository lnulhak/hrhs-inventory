"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, MapPin, Package, AlertCircle, Check, X,
  Calendar, Clock, ArrowUpDown, Pencil, Minus, SlidersHorizontal,
  LogOut, Eye, Lock, ArrowLeft, Mail, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Normalise a Supabase row to the shape the UI expects
function normalise(row) {
  return {
    id:        row.id,
    name:      row.name,
    brand:     row.brand || "",
    qty:       row.quantity,
    unit:      row.unit,
    expiry:    row.expiry,
    location:  row.location,
    loggedBy:  row.logged_by,
    loggedAt:  row.created_at ? row.created_at.slice(0, 10) : "",
    status:    row.status,
    notes:     row.notes || "",
  };
}

export default function HRHSInventory() {
  // createClient() is only called inside effects/handlers (client-side only),
  // never at render time, so the build doesn't need the env vars at prerender.

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [authState, setAuthState] = useState({ role: null, username: "" }); // role: "admin" | "guest" | null
  const [authView, setAuthView] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [loginError, setLoginError] = useState("");
  const [resetError, setResetError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiry-asc");
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmMode, setConfirmMode] = useState(null);
  const [qtyTakenInput, setQtyTakenInput] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", brand: "", qty: "", unit: "packs", expiry: "", location: "Location 1", customLocation: "", loggedBy: "", notes: "" });
  const [addAttempted, setAddAttempted] = useState(false);

  const today = new Date();
  const isAdmin = authState.role === "admin";
  const isGuest = authState.role === "guest";

  // ── Session check on mount ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthState({ role: "admin", username: session.user.email });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthState({ role: "admin", username: session.user.email });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load items whenever the user is in (admin or guest) ──────────────────
  useEffect(() => {
    if (authState.role) loadItems();
  }, [authState.role]);

  const loadItems = async () => {
    const supabase = createClient();
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("expiry", { ascending: true });
    if (!error && data) setItems(data.map(normalise));
    setLoading(false);
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginError("Please enter both email and password.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    if (error) {
      setLoginError("Incorrect email or password.");
      return;
    }
    setLoginError("");
    setLoginForm({ email: "", password: "" });
  };

  const handleForgotSubmit = () => {
    if (!forgotEmail.trim()) return;
    setAuthView("forgot-sent");
  };

  const handleResetSubmit = () => {
    if (!resetForm.password || !resetForm.confirm) {
      setResetError("Please fill in both fields.");
      return;
    }
    if (resetForm.password.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      setResetError("Passwords don't match.");
      return;
    }
    setResetError("");
    setResetForm({ password: "", confirm: "" });
    setAuthView("reset-success");
  };

  const handleGuestEntry = () => {
    setAuthState({ role: "guest", username: "" });
  };

  const handleLogout = async () => {
    if (isAdmin) await createClient().auth.signOut();
    setAuthState({ role: null, username: "" });
    setLoginForm({ email: "", password: "" });
    setForgotEmail("");
    setResetForm({ password: "", confirm: "" });
    setAuthView("login");
    setLoginError("");
    setResetError("");
    setItems([]);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const daysUntilExpiry = (dateStr) => {
    const expiry = new Date(dateStr);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const urgencyClass = (days) => {
    if (days < 0) return "expired";
    if (days <= 3) return "critical";
    if (days <= 7) return "warning";
    return "ok";
  };

  const urgencyLabel = (days) => {
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `${days} days left`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const exportCSV = () => {
    const available = items.filter(i => i.status === "available");
    const headers = ["Item Name", "Brand", "Quantity", "Unit", "Expiry Date", "Location", "Logged By", "Date Received", "Status", "Notes"];
    const escape = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = available.map(i => [
      i.name, i.brand, i.qty, i.unit, i.expiry, i.location, i.loggedBy, i.loggedAt, i.status, i.notes
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hrhs-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const sortedFilteredItems = useMemo(() => {
    const sorters = {
      "expiry-asc":  (a, b) => new Date(a.expiry) - new Date(b.expiry),
      "expiry-desc": (a, b) => new Date(b.expiry) - new Date(a.expiry),
      "logged-desc": (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt),
      "logged-asc":  (a, b) => new Date(a.loggedAt) - new Date(b.loggedAt),
      "name-asc":    (a, b) => a.name.localeCompare(b.name),
    };
    return items
      .filter(item => item.status === "available")
      .filter(item => filter === "all" || item.location === filter)
      .filter(item => {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q);
      })
      .sort(sorters[sortBy] || sorters["expiry-asc"]);
  }, [items, filter, search, sortBy]);

  const stats = useMemo(() => {
    const available = items.filter(i => i.status === "available");
    return {
      total:   available.length,
      expired: available.filter(i => daysUntilExpiry(i.expiry) < 0).length,
    };
  }, [items]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddAttempted(true);
    const finalLocation = newItem.location === "Other" ? newItem.customLocation.trim() : newItem.location;
    if (!newItem.name || !newItem.qty || !newItem.expiry || !newItem.loggedBy) return;
    if (newItem.location === "Other" && !finalLocation) return;

    const { error } = await createClient().from("items").insert({
      name:      newItem.name,
      brand:     newItem.brand || null,
      quantity:  parseInt(newItem.qty),
      unit:      newItem.unit,
      expiry:    newItem.expiry,
      location:  finalLocation,
      logged_by: newItem.loggedBy,
      notes:     newItem.notes || null,
      status:    "available",
    });

    if (!error) {
      await loadItems();
      setNewItem({ name: "", brand: "", qty: "", unit: "packs", expiry: "", location: "Location 1", customLocation: "", loggedBy: "", notes: "" });
      setAddAttempted(false);
      setShowAddForm(false);
    }
  };

  const saveEdit = async () => {
    if (!editingItem.name || !editingItem.qty || !editingItem.expiry) return;
    const finalLocation = editingItem.location === "Other" ? (editingItem.customLocation || "").trim() : editingItem.location;
    if (editingItem.location === "Other" && !finalLocation) return;

    const { error } = await createClient()
      .from("items")
      .update({
        name:     editingItem.name,
        brand:    editingItem.brand || null,
        quantity: parseInt(editingItem.qty),
        unit:     editingItem.unit,
        expiry:   editingItem.expiry,
        location: finalLocation,
        notes:    editingItem.notes || null,
      })
      .eq("id", editingItem.id);

    if (!error) {
      await loadItems();
      setEditingItem(null);
    }
  };

  const markAllTaken = async (id) => {
    const { error } = await createClient()
      .from("items")
      .update({ status: "taken" })
      .eq("id", id);

    if (!error) {
      await loadItems();
      setConfirmingId(null);
      setConfirmMode(null);
    }
  };

  const handleQtyTaken = async (item) => {
    const left = parseInt(qtyTakenInput);
    if (isNaN(left) || left < 0) return;

    if (left === 0) {
      await markAllTaken(item.id);
    } else {
      const { error } = await createClient()
        .from("items")
        .update({ quantity: left })
        .eq("id", item.id);

      if (!error) {
        await loadItems();
        setConfirmingId(null);
        setConfirmMode(null);
        setQtyTakenInput("");
      }
    }
  };

  const startAllTaken = (item) => { setConfirmingId(item.id); setConfirmMode("all"); };
  const startSomeTaken = (item) => {
    setConfirmingId(item.id);
    setConfirmMode("some");
    setQtyTakenInput(String(Math.max(0, item.qty - 1)));
  };
  const cancelConfirm = () => { setConfirmingId(null); setConfirmMode(null); setQtyTakenInput(""); };

  const locations = ["Location 1", "Location 2", "Location 3"];

  // ── Auth screens ──────────────────────────────────────────────────────────
  if (!authState.role) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="display text-3xl font-semibold text-hrhs-navy leading-none">好人好事</div>
            <div className="display text-base font-medium text-hrhs-navy mt-2">Hao Ren Hao Shi</div>
            <div className="text-xs text-stone-500 uppercase tracking-wider mt-2">Inventory Management System</div>
            <div className="w-12 h-px bg-hrhs-crimson mx-auto mt-4"></div>
          </div>

          {authView === "login" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3">
                <h2 className="display text-lg font-semibold text-hrhs-navy mb-1">Sign in</h2>
                <p className="text-xs text-stone-500 mb-3">Please sign in as admin to manage inventory.</p>

                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-lg px-3 py-2.5 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                      type="email"
                      placeholder="admin@hrhs-temp.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Password</label>
                    <button onClick={() => { setAuthView("forgot"); setLoginError(""); }} className="text-xs text-hrhs-navy hover:underline font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <button onClick={handleLogin} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark text-white font-semibold py-3 rounded-lg mt-2 transition">
                  Sign in
                </button>
              </div>

              <div className="mt-5 text-center">
                <div className="text-xs text-stone-500 mb-2">or</div>
                <button onClick={handleGuestEntry} className="inline-flex items-center gap-1.5 text-sm font-medium text-hrhs-navy hover:underline">
                  <Eye size={14} /> Continue as guest (view only)
                </button>
              </div>
            </>
          )}

          {authView === "forgot" && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3">
              <h2 className="display text-lg font-semibold text-hrhs-navy mb-1">Reset password</h2>
              <p className="text-xs text-stone-500 mb-3">Enter the email associated with your account. We'll send you a link to reset your password.</p>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input type="email" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleForgotSubmit()} className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
                </div>
              </div>
              <button onClick={handleForgotSubmit} disabled={!forgotEmail.trim()} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark disabled:bg-stone-300 text-white font-semibold py-3 rounded-lg mt-2 transition">Send reset link</button>
              <button onClick={() => setAuthView("login")} className="w-full text-sm text-stone-600 hover:text-hrhs-navy py-2 inline-flex items-center justify-center gap-1.5"><ArrowLeft size={14} /> Back to sign in</button>
            </div>
          )}

          {authView === "forgot-sent" && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3">
              <div className="flex justify-center mb-2"><div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><Mail size={20} className="text-emerald-700" /></div></div>
              <h2 className="display text-lg font-semibold text-hrhs-navy text-center">Check your email</h2>
              <p className="text-xs text-stone-600 text-center">If an account exists for <span className="font-semibold text-stone-800">{forgotEmail}</span>, we've sent a password reset link. The link expires in 1 hour.</p>
              <p className="text-xs text-stone-500 text-center">Didn't get the email? Check your spam folder, or contact another admin if you remain locked out.</p>
              <div className="border-t border-stone-100 pt-3 mt-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3"><span className="font-semibold">Prototype:</span> No real email sent. Click below to simulate the reset link.</p>
                <button onClick={() => setAuthView("reset")} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition">Simulate clicking email link →</button>
              </div>
              <button onClick={() => { setAuthView("login"); setForgotEmail(""); }} className="w-full text-sm text-stone-600 hover:text-hrhs-navy py-2 inline-flex items-center justify-center gap-1.5"><ArrowLeft size={14} /> Back to sign in</button>
            </div>
          )}

          {authView === "reset" && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3">
              <h2 className="display text-lg font-semibold text-hrhs-navy mb-1">Set new password</h2>
              <p className="text-xs text-stone-500 mb-3">Choose a strong password with at least 8 characters.</p>
              {resetError && <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-lg px-3 py-2.5 flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{resetError}</span></div>}
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">New password</label>
                <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} /><input type="password" placeholder="At least 8 characters" value={resetForm.password} onChange={e => setResetForm({ ...resetForm, password: e.target.value })} className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" /></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Confirm password</label>
                <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} /><input type="password" placeholder="Re-enter new password" value={resetForm.confirm} onChange={e => setResetForm({ ...resetForm, confirm: e.target.value })} onKeyDown={e => e.key === "Enter" && handleResetSubmit()} className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" /></div>
              </div>
              <button onClick={handleResetSubmit} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark text-white font-semibold py-3 rounded-lg mt-2 transition">Update password</button>
            </div>
          )}

          {authView === "reset-success" && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3">
              <div className="flex justify-center mb-2"><div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><Check size={22} className="text-emerald-700" /></div></div>
              <h2 className="display text-lg font-semibold text-hrhs-navy text-center">Password updated</h2>
              <p className="text-xs text-stone-600 text-center">Your password has been changed successfully.</p>
              <button onClick={() => { setAuthView("login"); setForgotEmail(""); }} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark text-white font-semibold py-3 rounded-lg mt-2 transition">Back to sign in</button>
            </div>
          )}

          <div className="mt-8 text-center text-xs text-stone-400">v0.9 · HRHS Inventory</div>
        </div>
      </div>
    );
  }

  // ── Main inventory view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">

      <header className="bg-hrhs-navy text-stone-50 px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1 gap-3">
            <div className="min-w-0">
              <div className="display text-xl font-semibold leading-none">
                好人好事<span className="text-hrhs-crimson"> · </span><span className="text-base font-medium">Hao Ren Hao Shi</span>
              </div>
              <h1 className="text-sm text-stone-300 mt-1.5 tracking-wide">Inventory Management System</h1>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-xs">
                {isAdmin ? (
                  <span className="bg-emerald-700/30 text-emerald-200 px-2 py-0.5 rounded-full font-medium border border-emerald-700/40">Admin · {authState.username}</span>
                ) : (
                  <span className="bg-stone-700/40 text-stone-300 px-2 py-0.5 rounded-full font-medium border border-stone-700/50">Guest · view only</span>
                )}
              </div>
              <button onClick={handleLogout} className="text-xs text-stone-400 hover:text-stone-100 inline-flex items-center gap-1">
                {isAdmin ? <><LogOut size={11} /> Sign out</> : <><ArrowLeft size={11} /> Exit</>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isGuest && (
        <div className="bg-stone-100 border-b border-stone-200 px-5 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2 text-xs text-stone-600">
            <Eye size={13} className="shrink-0" />
            <span>You're viewing in read-only mode. Sign in as admin to edit inventory.</span>
          </div>
        </div>
      )}

      <div className={`max-w-2xl mx-auto px-5 ${isGuest ? "mt-3" : "-mt-3"}`}>
        <div className="grid grid-cols-2 gap-2 bg-white rounded-xl shadow-sm border border-stone-200 p-3">
          <div className="text-center">
            <div className="display text-2xl font-semibold text-hrhs-navy">{stats.total}</div>
            <div className="text-xs text-stone-500 uppercase tracking-wide">Items</div>
          </div>
          <div className="text-center border-l border-stone-100">
            <div className="display text-2xl font-semibold text-hrhs-crimson">{stats.expired}</div>
            <div className="text-xs text-stone-500 uppercase tracking-wide">Expired</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 mt-4">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input type="text" placeholder="Search by item name or brand" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={14} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-full pl-7 pr-7 py-2.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:outline-none focus:border-stone-900 appearance-none cursor-pointer">
              <option value="expiry-asc">Expiring soonest</option>
              <option value="expiry-desc">Expiring latest</option>
              <option value="logged-desc">Recently added</option>
              <option value="logged-asc">Oldest in stock</option>
              <option value="name-asc">Name (A–Z)</option>
            </select>
          </div>
          {isAdmin && (
            <button onClick={exportCSV} className="px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5 whitespace-nowrap" title="Export inventory as CSV">
              <Download size={14} /><span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(() => {
            const inUse = Array.from(new Set(items.filter(i => i.status === "available").map(i => i.location)));
            const customInUse = inUse.filter(l => !locations.includes(l));
            const allChips = [
              { key: "all", label: "All" },
              ...locations.map(l => ({ key: l, label: l })),
              ...customInUse.map(l => ({ key: l, label: l })),
            ];
            return allChips.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filter === f.key ? "bg-hrhs-navy text-white" : "bg-white text-stone-700 border border-stone-200"}`}>
                {f.label}
              </button>
            ));
          })()}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 mt-4 pb-32">
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Loading inventory…</div>
        ) : sortedFilteredItems.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Package size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm">{items.filter(i => i.status === "available").length === 0 ? "No items to display." : "No items match this filter."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFilteredItems.map(item => {
              const days = daysUntilExpiry(item.expiry);
              const u = urgencyClass(days);
              return (
                <div key={item.id} className={`rounded-lg border-l-4 border border-stone-200 p-4 urgency-${u} transition`}>
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="display text-lg font-semibold text-hrhs-navy leading-tight">{item.name}</h3>
                      {item.brand && <div className="text-xs text-stone-500 mt-0.5">{item.brand}</div>}
                      <div className="text-sm text-stone-600 mt-0.5">{item.qty} {item.unit}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`pill-${u} text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap`}>{urgencyLabel(days)}</span>
                      <span className="text-xs text-stone-500 whitespace-nowrap">{formatDate(item.expiry)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 mt-2">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Received {formatDate(item.loggedAt)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> by {item.loggedBy}</span>
                  </div>

                  {item.notes && <div className="text-xs text-stone-500 italic mt-2 pt-2 border-t border-stone-100">{item.notes}</div>}

                  {isAdmin && (
                    <div className="mt-3">
                      {confirmingId === item.id && confirmMode === "all" ? (
                        <div className="bg-white border border-stone-200 rounded-lg p-3">
                          <div className="text-xs text-stone-700 mb-2 text-center">Remove all <span className="font-semibold">{item.qty} {item.unit}</span> from stock?</div>
                          <div className="flex gap-2">
                            <button onClick={cancelConfirm} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5"><X size={14} /> Cancel</button>
                            <button onClick={() => markAllTaken(item.id)} className="flex-1 bg-hrhs-crimson hover:bg-hrhs-crimson-dark text-white text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5"><Check size={14} /> Confirm</button>
                          </div>
                        </div>
                      ) : confirmingId === item.id && confirmMode === "some" ? (
                        <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-2">
                          <div className="text-xs font-semibold text-stone-700 uppercase tracking-wide">How many {item.unit} left?</div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQtyTakenInput(String(Math.max(0, parseInt(qtyTakenInput || "0") - 1)))} className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-md flex items-center justify-center text-stone-700"><Minus size={16} /></button>
                            <input type="number" value={qtyTakenInput} onChange={e => setQtyTakenInput(e.target.value)} min="0" max={item.qty - 1} className="flex-1 text-center py-2 border border-stone-200 rounded-md text-sm font-semibold focus:outline-none focus:border-stone-900" />
                            <button onClick={() => setQtyTakenInput(String(Math.min(item.qty - 1, parseInt(qtyTakenInput || "0") + 1)))} className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-md flex items-center justify-center text-stone-700"><Plus size={16} /></button>
                            <span className="text-xs text-stone-500 px-1">of {item.qty}</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={cancelConfirm} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5"><X size={14} /> Cancel</button>
                            <button onClick={() => handleQtyTaken(item)} disabled={qtyTakenInput === "" || parseInt(qtyTakenInput) < 0 || parseInt(qtyTakenInput) >= item.qty} className="flex-1 bg-hrhs-crimson hover:bg-hrhs-crimson-dark disabled:bg-stone-300 text-white text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5"><Check size={14} /> Confirm</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => startAllTaken(item)} className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-2.5 rounded-md flex items-center justify-center gap-1 transition" style={{ flex: "0 0 40%" }}><Check size={15} /> Clear Stock</button>
                          <button onClick={() => startSomeTaken(item)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-md flex items-center justify-center gap-1 transition" style={{ flex: "0 0 40%" }}><SlidersHorizontal size={14} /> Adjust Stock</button>
                          <button
                            onClick={() => {
                              const isPreset = locations.includes(item.location);
                              setEditingItem({ ...item, location: isPreset ? item.location : "Other", customLocation: isPreset ? "" : item.location });
                            }}
                            className="bg-hrhs-navy hover:bg-hrhs-navy-dark text-white text-sm font-semibold py-2.5 rounded-md flex items-center justify-center transition"
                            style={{ flex: "0 0 calc(20% - 12px)" }}
                            title="Edit" aria-label="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && (
        <button onClick={() => setShowAddForm(true)} className="fixed bottom-6 right-6 bg-hrhs-navy hover:bg-hrhs-navy-dark text-white rounded-full shadow-lg p-4 flex items-center gap-2 transition">
          <Plus size={22} /><span className="font-semibold pr-1">Log food</span>
        </button>
      )}

      {isAdmin && showAddForm && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => { setShowAddForm(false); setAddAttempted(false); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex justify-between items-center">
              <h2 className="display text-xl font-semibold">Log new item</h2>
              <button onClick={() => { setShowAddForm(false); setAddAttempted(false); }} className="text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {addAttempted && (!newItem.name || !newItem.qty || !newItem.expiry || !newItem.loggedBy || (newItem.location === "Other" && !newItem.customLocation.trim())) && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-lg px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Please fill in all required fields marked with <span className="text-red-600 font-bold">*</span></span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Item name <span className="text-red-600">*</span></label>
                <input type="text" placeholder="e.g. Wholemeal bread" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-stone-900 ${addAttempted && !newItem.name ? "border-red-400 bg-red-50" : "border-stone-200"}`} />
                {addAttempted && !newItem.name && <p className="text-xs text-red-600 mt-1">Item name is required</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Brand <span className="text-stone-400 normal-case font-normal">— optional</span></label>
                <input type="text" placeholder="e.g. Gardenia" value={newItem.brand} onChange={e => setNewItem({ ...newItem, brand: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Quantity <span className="text-red-600">*</span></label>
                  <input type="number" placeholder="e.g. 12" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-stone-900 ${addAttempted && !newItem.qty ? "border-red-400 bg-red-50" : "border-stone-200"}`} />
                  {addAttempted && !newItem.qty && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Unit</label>
                  <select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900 bg-white">
                    <option>packs</option><option>cans</option><option>cartons</option><option>kg</option><option>loaves</option><option>cups</option><option>boxes</option><option>bottles</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Expiry date <span className="text-red-600">*</span></label>
                <input type="date" value={newItem.expiry} onChange={e => setNewItem({ ...newItem, expiry: e.target.value })} className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-stone-900 ${addAttempted && !newItem.expiry ? "border-red-400 bg-red-50" : "border-stone-200"}`} />
                {addAttempted && !newItem.expiry && <p className="text-xs text-red-600 mt-1">Expiry date is required</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Location</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[...locations, "Other"].map(loc => (
                    <button key={loc} onClick={() => setNewItem({ ...newItem, location: loc })} className={`px-2 py-2 rounded-lg text-xs font-medium transition ${newItem.location === loc ? "bg-hrhs-navy text-white" : "bg-stone-100 text-stone-700"}`}>{loc}</button>
                  ))}
                </div>
                {newItem.location === "Other" && (
                  <div className="mt-2">
                    <input type="text" placeholder="Specify location (e.g. Volunteer's home, event venue)" value={newItem.customLocation} onChange={e => setNewItem({ ...newItem, customLocation: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-stone-900 ${addAttempted && !newItem.customLocation.trim() ? "border-red-400 bg-red-50" : "border-stone-200"}`} />
                    {addAttempted && !newItem.customLocation.trim() && <p className="text-xs text-red-600 mt-1">Please specify the location</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Logged by <span className="text-red-600">*</span></label>
                <input type="text" placeholder="Your name" value={newItem.loggedBy} onChange={e => setNewItem({ ...newItem, loggedBy: e.target.value })} className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-stone-900 ${addAttempted && !newItem.loggedBy ? "border-red-400 bg-red-50" : "border-stone-200"}`} />
                {addAttempted && !newItem.loggedBy && <p className="text-xs text-red-600 mt-1">Please enter your name</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Notes <span className="text-stone-400 normal-case font-normal">— optional</span></label>
                <textarea placeholder="e.g. Fragile, keep refrigerated" value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} rows="2" className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900 resize-none" />
              </div>

              <button onClick={handleAdd} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark text-white font-semibold py-3 rounded-lg mt-3 transition">Save to inventory</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && editingItem && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex justify-between items-center">
              <h2 className="display text-xl font-semibold">Edit item</h2>
              <button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Item name</label>
                <input type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Brand <span className="text-stone-400 normal-case font-normal">— optional</span></label>
                <input type="text" value={editingItem.brand || ""} onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Quantity</label>
                  <input type="number" value={editingItem.qty} onChange={e => setEditingItem({ ...editingItem, qty: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Unit</label>
                  <select value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900 bg-white">
                    <option>packs</option><option>cans</option><option>cartons</option><option>kg</option><option>loaves</option><option>cups</option><option>boxes</option><option>bottles</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Expiry date</label>
                <input type="date" value={editingItem.expiry} onChange={e => setEditingItem({ ...editingItem, expiry: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Location</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[...locations, "Other"].map(loc => (
                    <button key={loc} onClick={() => setEditingItem({ ...editingItem, location: loc })} className={`px-2 py-2 rounded-lg text-xs font-medium transition ${editingItem.location === loc ? "bg-hrhs-navy text-white" : "bg-stone-100 text-stone-700"}`}>{loc}</button>
                  ))}
                </div>
                {editingItem.location === "Other" && (
                  <input type="text" placeholder="Specify location (e.g. Volunteer's home, event venue)" value={editingItem.customLocation || ""} onChange={e => setEditingItem({ ...editingItem, customLocation: e.target.value })} className="w-full mt-2 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900" />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Notes <span className="text-stone-400 normal-case font-normal">— optional</span></label>
                <textarea value={editingItem.notes} onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })} rows="2" className="w-full mt-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900 resize-none" />
              </div>
              <div className="text-xs text-stone-500 pt-1">Originally logged by {editingItem.loggedBy} on {formatDate(editingItem.loggedAt)}</div>
              <button onClick={saveEdit} disabled={!editingItem.name || !editingItem.qty || !editingItem.expiry} className="w-full bg-hrhs-navy hover:bg-hrhs-navy-dark disabled:bg-stone-300 text-white font-semibold py-3 rounded-lg mt-3 transition">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
