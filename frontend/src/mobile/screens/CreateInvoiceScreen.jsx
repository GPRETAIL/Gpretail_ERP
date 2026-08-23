import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Create Invoice screen with real API integration.
 */
export default function CreateInvoiceScreen({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [nextBillNo, setNextBillNo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState([
    { name: "", hsn: "", qty: 1, rate: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load customers and next bill number
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

        const billNo =
          billRes.data?.data?.billNo ||
          billRes.data?.data?.nextBillNo ||
          billRes.data?.billNo ||
          "";
        setNextBillNo(billNo);
      } catch {
        // Silently handle
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

  const handleSave = async (sendToo) => {
    setSaving(true);
    try {
      // Build payload matching existing POS sales API
      const payload = {
        customerName: selectedCustomer || "Walking Customer",
        billNo: nextBillNo,
        items: items
          .filter((item) => item.name && item.rate > 0)
          .map((item) => ({
            productName: item.name,
            hsnCode: item.hsn,
            quantity: item.qty,
            sellingPrice: item.rate,
          })),
      };
      await api.post("/pos-sales", payload);
      onBack();
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
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
          onClick={onBack}
          disabled={saving}
          className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-98 transition-all"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Send"}
        </button>
      </div>
    </div>
  );
}
