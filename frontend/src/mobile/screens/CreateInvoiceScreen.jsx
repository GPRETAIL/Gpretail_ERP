import React, { useState, useEffect } from "react";
import { Plus, CloudOff, Check } from "lucide-react";
import api from "../../api/axios";
import { saveDraft, addToSyncQueue, getCachedData, setCachedData } from "../offline/db";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Create Invoice screen with Offline Draft & Sync Queue integration.
 */
export default function CreateInvoiceScreen({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [nextBillNo, setNextBillNo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState([
    { name: "", hsn: "", qty: 1, rate: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Load customers and next bill number (with offline cache fallback)
    (async () => {
      try {
        const [custRes, billRes] = await Promise.all([
          api.get("/customers", { params: { limit: 100 } }),
          api.get("/pos-sales/next-bill-no"),
        ]);
        const custData = custRes.data?.data;
        const custList = Array.isArray(custData)
          ? custData
          : custData?.data || custData?.items || [];
        setCustomers(custList);
        setCachedData("customers_list", custList);

        const billNo =
          billRes.data?.data?.billNo ||
          billRes.data?.data?.nextBillNo ||
          billRes.data?.billNo ||
          "";
        setNextBillNo(billNo);
      } catch {
        // Fallback to cached customers
        const cachedCusts = await getCachedData("customers_list");
        if (cachedCusts) setCustomers(cachedCusts);
        setNextBillNo(`OFFLINE-${Date.now().toString().slice(-6)}`);
      }
    })();
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;

  const addItem = () => {
    setItems([...items, { name: "", hsn: "", qty: 1, rate: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const buildPayload = () => ({
    customerName: selectedCustomer || "Walking Customer",
    billNo: nextBillNo || `INV-${Date.now().toString().slice(-6)}`,
    date: dateStr,
    items: items
      .filter((item) => item.name && item.rate > 0)
      .map((item) => ({
        productName: item.name,
        hsnCode: item.hsn,
        quantity: item.qty,
        sellingPrice: item.rate,
      })),
    subtotal,
    cgst,
    sgst,
    total,
  });

  const handleSaveOffline = async () => {
    setSaving(true);
    const payload = buildPayload();
    await saveDraft("invoice", payload);
    await addToSyncQueue("create_invoice", "/pos-sales", "POST", payload);
    setFeedback("Saved as Offline Draft & Queued for Sync!");
    setTimeout(() => {
      onBack();
    }, 900);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = buildPayload();

    if (!navigator.onLine) {
      await handleSaveOffline();
      return;
    }

    try {
      await api.post("/pos-sales", payload);
      setFeedback("Invoice created successfully!");
      setTimeout(() => {
        onBack();
      }, 700);
    } catch {
      // Auto fallback to offline draft if network fails
      await handleSaveOffline();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Customer Selection */}
      <div className="vx-card">
        <label className="text-xs font-semibold text-slate-700 block mb-1">
          Customer
        </label>
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">Select Customer ▾</option>
          <option value="Walking Customer">Walking Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name || c.customerName}>
              {c.name || c.customerName}
            </option>
          ))}
        </select>
      </div>

      {/* Invoice Details */}
      <div className="vx-card space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 m-0">
          Invoice Details
        </h4>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Invoice Number</span>
          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">
            {nextBillNo || "Loading..."}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Invoice Date</span>
          <span className="font-medium text-slate-800">{dateStr}</span>
        </div>
      </div>

      {/* Items Section */}
      <div className="vx-card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-900 m-0">Items</h4>
          <button
            type="button"
            className="text-xs font-bold text-indigo-600 flex items-center gap-1"
            onClick={addItem}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3 space-y-2"
          >
            <input
              type="text"
              placeholder="Product Name"
              value={item.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="HSN"
                value={item.hsn}
                onChange={(e) => updateItem(idx, "hsn", e.target.value)}
                className="w-1/3 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) =>
                  updateItem(idx, "qty", parseInt(e.target.value) || 0)
                }
                className="w-1/3 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
              />
              <input
                type="number"
                placeholder="Rate"
                value={item.rate || ""}
                onChange={(e) =>
                  updateItem(idx, "rate", parseFloat(e.target.value) || 0)
                }
                className="w-1/3 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
              />
            </div>
            <div className="text-right text-xs font-bold text-slate-900">
              {money(item.qty * item.rate)}
            </div>
          </div>
        ))}

        {/* Totals Summary */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>CGST (9%)</span>
            <span>{money(cgst)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>SGST (9%)</span>
            <span>{money(sgst)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleSaveOffline}
          disabled={saving}
          className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-98 transition-all flex items-center justify-center gap-1.5"
        >
          <CloudOff size={14} className="text-slate-500" />
          <span>Save Draft</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Create"}
        </button>
      </div>
    </div>
  );
}
