import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  Minus,
  Trash2,
  Camera,
  CameraOff,
  Zap,
  ZapOff,
  ChevronLeft,
  QrCode,
  Printer,
  Share2,
  ShoppingBasket,
  Search,
  Check,
  Building,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import api from "../../api/axios";
import { saveDraft, addToSyncQueue, getCachedData, setCachedData } from "../offline/db";
import { fetchSalesReceiptCustomization, buildUpiPaymentUri } from "../../utils/salesReceiptCustomization";
import { printPosSaleReceipt, buildPosSaleReceiptHtmlForSale } from "../../utils/posSaleReceiptPrinter";
import { getHtmlAsPdfBlob } from "../../utils/htmlToPdf";
import { usePrintContext } from "../../context/PrintContext";
import useHaptics from "../hooks/useHaptics";
import useNativeShare from "../hooks/useNativeShare";
import { setHasUnsavedWork } from "../utils/unsavedWork";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Mobile POS Billing / Create Invoice Screen
 * Inspired by flutter_billing_app layout and flow.
 */
export default function CreateInvoiceScreen({ onBack }) {
  const authUser = useSelector((s) => s.auth.user);
  const { queuePrintHtml } = usePrintContext();
  const { vibrate } = useHaptics();
  const { isSupported: canShare, shareFile } = useNativeShare();

  // Navigation & Step Control
  const [step, setStep] = useState("billing"); // 'billing' | 'checkout'

  // Data States
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [, setNextBillNo] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentUpiId, setPaymentUpiId] = useState("");

  // Cart State
  const [cartItems, setCartItems] = useState([]); // { product, quantity }

  // Flags an in-progress, not-yet-saved invoice so the PWA update banner can
  // warn before a reload would silently discard it. Cleared on unmount too
  // (navigating away, e.g. after a successful save which resets cartItems
  // anyway) so a stale "unsaved work" flag can't outlive this screen.
  useEffect(() => {
    setHasUnsavedWork(cartItems.length > 0);
  }, [cartItems.length]);
  useEffect(() => () => setHasUnsavedWork(false), []);

  // Hardware Scanner State
  const [cameraOn, setCameraOn] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Scanner Video reference & controls
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scanCooldownsRef = useRef({});

  // 1. Initial Load of Catalog & Customers
  useEffect(() => {
    (async () => {
      try {
        const [custRes, billRes, prodRes] = await Promise.all([
          api.get("/customers", { params: { limit: 100 } }),
          api.get("/pos-sales/next-bill-no"),
          api.get("/products", { params: { limit: 500 } }),
        ]);

        const custList = custRes.data?.data || custRes.data || [];
        setCustomers(custList);
        setCachedData("customers_list", custList);

        const billNo = billRes.data?.data?.bill_no || billRes.data?.data?.invoice_no || "";
        setNextBillNo(billNo);

        const prodList = prodRes.data?.data || prodRes.data?.items || [];
        setCatalog(prodList);
        setCachedData("products_catalog", prodList);
      } catch {
        // Offline fallbacks
        const cachedCusts = await getCachedData("customers_list");
        if (cachedCusts) setCustomers(cachedCusts);
        const cachedCatalog = await getCachedData("products_catalog");
        if (cachedCatalog) setCatalog(cachedCatalog || []);

        setNextBillNo(`OFFLINE-${Date.now().toString().slice(-6)}`);
      }
    })();
  }, []);

  // Real "Scan to Pay" UPI ID from the Sales Customization settings - was
  // previously a hardcoded gpsoftware@okaxis, which routed every mobile
  // sale's payment to the wrong account regardless of what the store
  // actually configured.
  useEffect(() => {
    const cid = authUser?.company_id;
    if (!cid) return;
    let cancelled = false;
    fetchSalesReceiptCustomization(api, cid, { fallbackToLocal: false })
      .then((customization) => {
        if (!cancelled) setPaymentUpiId(customization?.paymentUpiId || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authUser?.company_id]);

  // Add Item callback after barcode match
  const handleScanBarcode = useCallback((barcode) => {
    const now = Date.now();
    const lastScan = scanCooldownsRef.current[barcode] || 0;
    if (now - lastScan < 2000) return; // Cooldown limit 2 seconds
    scanCooldownsRef.current[barcode] = now;

    // Vibrate to provide tactile scan confirmation
    vibrate("scan");

    // Search product in catalog
    const matched = catalog.find(
      (p) =>
        String(p.productCode || "").trim() === String(barcode).trim() ||
        String(p.sku || "").trim() === String(barcode).trim() ||
        String(p.barcode || "").trim() === String(barcode).trim() ||
        String(p.id) === String(barcode)
    );

    if (matched) {
      setCartItems((prev) => {
        const existing = prev.find((item) => item.product.id === matched.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === matched.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          return [...prev, { product: matched, quantity: 1 }];
        }
      });
      setSuccessMsg(`Scanned: ${matched.productName || matched.name}`);
      setTimeout(() => setSuccessMsg(null), 1800);
    } else {
      setErrorMsg(`Product code "${barcode}" not found in catalog.`);
      setTimeout(() => setErrorMsg(null), 2500);
    }
  }, [catalog, vibrate]);

  // 2. Barcode Scanning Logic
  useEffect(() => {
    if (step !== "billing" || !cameraOn) {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    let codeReader = new BrowserMultiFormatReader();
    let active = true;

    codeReader
      .decodeFromVideoDevice(
        undefined, // default back camera
        videoRef.current,
        (result, err) => {
          if (!active) return;
          if (result) {
            const code = result.getText();
            handleScanBarcode(code);
          }
        }
      )
      .then((controls) => {
        if (active) {
          controlsRef.current = controls;
        } else {
          controls.stop();
        }
      })
      .catch((err) => {
        console.warn("Camera init failed: ", err);
      });

    return () => {
      active = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [step, cameraOn, handleScanBarcode]);

  // Flashlight / Torch toggle
  const handleToggleTorch = async () => {
    if (!controlsRef.current) return;
    try {
      const stream = videoRef.current?.srcObject;
      const track = stream?.getVideoTracks()?.[0];
      if (track) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          const nextTorch = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
          setTorchOn(nextTorch);
        } else {
          setErrorMsg("Torch constraint not supported on this camera device.");
        }
      }
    } catch {
      setErrorMsg("Failed to toggle flashlight.");
    }
  };

  // Search Add Action
  const handleSearchSelect = (prod) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product: prod, quantity: 1 }];
      }
    });
    setSearchQuery("");
  };

  // Quantity updates
  const updateQty = (prodId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === prodId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (prodId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== prodId));
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.selling_price || 0),
    0
  );
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Payload Construction — must match PosSaleController::store()'s real
  // contract (items[].productId/qty/price, customerId), not display-only
  // field names. A mismatch here used to fail backend validation (422),
  // get silently caught, and the invoice was never actually saved.
  const buildPayload = () => ({
    customerId: selectedCustomer || null,
    items: cartItems.map((item) => ({
      productId: item.product.id,
      qty: item.quantity,
      price: Number(item.product.selling_price || 0),
      tax: 18, // matches the flat CGST 9% + SGST 9% shown in the checkout summary
    })),
  });

  // Offline Draft & Sync Queue Integration
  const handleSaveOffline = async () => {
    setSaving(true);
    const payload = buildPayload();
    await saveDraft("invoice", payload);
    await addToSyncQueue("create_invoice", "/pos-sales", "POST", payload);
    setSuccessMsg("Saved as Offline Draft & Queued for Sync!");
    setTimeout(() => {
      onBack();
    }, 900);
  };

  // Main Submit invoice to backend
  const handleSave = async () => {
    setSaving(true);
    const payload = buildPayload();

    if (!navigator.onLine) {
      await handleSaveOffline();
      return;
    }

    try {
      await api.post("/pos-sales", payload);
      setSuccessMsg("Invoice created successfully!");
      setTimeout(() => {
        onBack();
      }, 700);
    } catch {
      await handleSaveOffline();
    } finally {
      setSaving(false);
    }
  };

  // Shared by Print and Share: a receipt can't be produced for a sale that
  // doesn't exist yet, so both actions save first. Returns the saved sale
  // record, or null if it went to the offline queue instead (nothing to
  // print/share yet -- handleSaveOffline already handles its own message
  // and navigates back).
  const ensureInvoiceSaved = async () => {
    const payload = buildPayload();
    if (!navigator.onLine) {
      await handleSaveOffline();
      return null;
    }
    try {
      const res = await api.post("/pos-sales", payload);
      return res.data?.data;
    } catch {
      await handleSaveOffline();
      return null;
    }
  };

  const getCustomerName = () =>
    customers.find((c) => String(c.id) === String(selectedCustomer))?.name || "";

  // "Print Receipt" always saves the invoice first (a receipt can't be printed for a
  // sale that doesn't exist yet) using the exact same print pipeline as the desktop
  // POS Sales page -- same template builder, same Sales Customisation settings
  // (thermal/A4 format, direct-silent vs browser print mode), same print-connector --
  // so a mobile-created invoice's receipt looks identical to one printed from desktop.
  // "Complete & Save Invoice" (handleSave above) stays save-only, no printing.
  const handlePrint = async () => {
    setPrinting(true);
    const saved = await ensureInvoiceSaved();
    if (!saved) {
      setPrinting(false);
      return;
    }

    try {
      await printPosSaleReceipt(saved, { api, authUser, customerName: getCustomerName(), queuePrintHtml });
      setSuccessMsg("Invoice saved & sent to printer!");
    } catch (err) {
      console.warn("Receipt print failed:", err);
      setSuccessMsg("Invoice saved. Printing failed — check the printer connection.");
    } finally {
      setPrinting(false);
      setTimeout(() => {
        onBack();
      }, 900);
    }
  };

  // "Share Receipt" also saves first, same reasoning as Print -- then renders the
  // exact same receipt template as a PDF (via the shared html2pdf pipeline
  // htmlToPdf.js already uses for the desktop "Download PDF" button) and hands it
  // to the OS share sheet, so a cashier can send it straight to a customer's
  // WhatsApp/SMS/email without printing anything.
  const handleShare = async () => {
    setSharing(true);
    const saved = await ensureInvoiceSaved();
    if (!saved) {
      setSharing(false);
      return;
    }

    try {
      const { html, receiptData } = await buildPosSaleReceiptHtmlForSale(saved, {
        api,
        authUser,
        customerName: getCustomerName(),
      });
      // billNo looks like "SB/12345" - "/" isn't safe in a filename (some
      // OS/share targets read it as a path separator), so swap it for "-".
      const safeBillNo = String(receiptData.billNo || saved.id).replace(/[/\\]/g, "-");
      const filename = `Receipt-${safeBillNo}.pdf`;
      const file = await getHtmlAsPdfBlob(html, filename, { paperSize: receiptData.paperSize });
      const shared = await shareFile(file, {
        title: receiptData.storeName || "Receipt",
        text: `Receipt ${receiptData.billNo} - ${receiptData.storeName || ""}`,
      });
      setSuccessMsg(shared ? "Invoice saved & shared!" : "Invoice saved.");
    } catch (err) {
      console.warn("Receipt share failed:", err);
      setSuccessMsg("Invoice saved. Sharing failed.");
    } finally {
      setSharing(false);
      setTimeout(() => {
        onBack();
      }, 900);
    }
  };

  // Filter Catalog by Search Query
  const filteredCatalog = catalog.filter(
    (p) =>
      String(p.productName || p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.productCode || p.sku || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // QR Code Data Source Link - built from the store's real configured UPI ID
  // (Sales Customization page), matching the desktop receipt's own
  // buildUpiPaymentUri()/9876543210@upi fallback rather than a hardcoded
  // third-party account.
  const upiUrl = buildUpiPaymentUri({
    upiId: paymentUpiId || "9876543210@upi",
    payeeName: authUser?.company_name || "",
    amount: total,
  });
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`;

  // Return step 1: Billing & Barcode scanning
  if (step === "billing") {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] relative overflow-hidden bg-slate-900">
        
        {/* Alerts Block */}
        {errorMsg && (
          <div className="absolute top-2 left-2 right-2 z-50 p-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold text-center animate-bounce shadow-md">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="absolute top-2 left-2 right-2 z-50 p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center animate-pulse shadow-md">
            {successMsg}
          </div>
        )}

        {/* ─── SCANNER VIEW (TOP 40%) ─── */}
        <div
          className="relative w-full overflow-hidden bg-black shrink-0"
          style={{ flexBasis: "calc((100vh - 64px) * 0.4)" }}
        >
          
          {/* Header Action Bar */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white flex items-center justify-center active:scale-90 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`w-9 h-9 rounded-full border text-white flex items-center justify-center active:scale-90 transition-all ${
                  torchOn ? "bg-amber-500 border-amber-500" : "bg-black/40 border-white/20"
                }`}
              >
                {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setCameraOn(!cameraOn)}
                className={`w-9 h-9 rounded-full border text-white flex items-center justify-center active:scale-90 transition-all ${
                  cameraOn ? "bg-black/40 border-white/20" : "bg-rose-500 border-rose-500"
                }`}
              >
                {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
              </button>
            </div>
          </div>

          {/* Camera Video Stream */}
          {cameraOn ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-center px-4">
              <CameraOff size={32} className="text-slate-500 mb-2" />
              <h4 className="text-xs font-bold text-slate-350">Camera is turned off</h4>
              <p className="text-[10px] text-slate-500 mt-1">Turn on camera or use search below to add items.</p>
            </div>
          )}

          {/* Green Corner Scanner Bounding Box */}
          {cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[180px] h-[180px] border border-white/10 rounded-2xl relative">
                {/* 4 neon green corners */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* ─── BOTTOM PANEL (BOTTOM 60%) ─── */}
        <div className="flex-1 bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative">
          
          {/* Drag Handle Style Bar */}
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

          {/* Search/Lookup Row */}
          <div className="px-4 pb-2 relative shrink-0">
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 px-3 py-2 rounded-2xl">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-bold"
              />
            </div>

            {/* Filtered Search Results Box */}
            {searchQuery.trim() !== "" && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-2xl max-h-[160px] overflow-y-auto z-40 divide-y divide-slate-100">
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => handleSearchSelect(prod)}
                      className="p-3 text-xs font-bold text-slate-700 active:bg-slate-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span>{prod.productName || prod.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{prod.productCode || prod.sku}</span>
                      </div>
                      <span className="text-indigo-600">{money(prod.selling_price)}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">No items found</div>
                )}
              </div>
            )}
          </div>

          {/* Title and Summary Header */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 m-0 uppercase tracking-wide">Scanned Items</h3>
              <p className="text-[10px] text-slate-400 m-0 font-bold">{totalItemsCount} items total</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">Subtotal</span>
              <span className="text-sm font-black text-indigo-600">{money(subtotal)}</span>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 pb-24">
            {cartItems.length > 0 ? (
              <div className="space-y-2.5">
                {cartItems.map((item) => {
                  const name = item.product.productName || item.product.name;
                  const rate = Number(item.product.selling_price || 0);
                  return (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 m-0 leading-tight">{name}</h4>
                          <span className="text-[10px] text-slate-400 block font-bold mt-0.5">{money(rate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Decrement */}
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-black text-slate-800 w-4 text-center">{item.quantity}</span>
                        {/* Increment */}
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100"
                        >
                          <Plus size={14} />
                        </button>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center active:bg-rose-100 ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-350 mb-3 shadow-inner">
                  <ShoppingBasket size={30} />
                </div>
                <h4 className="text-xs font-bold text-slate-700 m-0">Bill List is Empty</h4>
                <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1">
                  Scanned products will show up here. Use the camera reader above to begin.
                </p>
              </div>
            )}
          </div>

          {/* Sticky Checkout Review Action */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-slate-100 z-10">
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setStep("checkout")}
              className={`w-full py-3.5 rounded-2xl flex items-center justify-between px-5 text-white font-extrabold text-xs shadow-md transition-all active:scale-98 ${
                cartItems.length === 0
                  ? "bg-slate-300 shadow-none cursor-not-allowed"
                  : "bg-indigo-600 shadow-indigo-600/20"
              }`}
            >
              <span>REVIEW BILL ({totalItemsCount})</span>
              <span className="text-sm font-black">{money(total)}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Return step 2: Checkout, Receipt, UPI scan & pay
  return (
    <div className="space-y-4 pb-12">
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep("billing")}
          className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-sm font-black text-slate-900 m-0">Checkout Summary</h3>
          <p className="text-[10px] text-slate-400 m-0 font-bold">Review payment details & print</p>
        </div>
      </div>

      {/* Customer Selector */}
      <div className="vx-card">
        <label className="text-xs font-semibold text-slate-700 block mb-1">
          Select Customer
        </label>
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">Walking Customer ▾</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Receipt Details Table */}
      <div className="vx-card overflow-hidden !p-0 border border-slate-200/80">
        <table className="w-full text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 text-left font-black uppercase text-[10px] text-slate-400">Product Name</th>
              <th className="p-3 text-right font-black uppercase text-[10px] text-slate-400">Rate</th>
              <th className="p-3 text-right font-black uppercase text-[10px] text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cartItems.map((item) => {
              const name = item.product.productName || item.product.name;
              const rate = Number(item.product.selling_price || 0);
              return (
                <tr key={item.product.id}>
                  <td className="p-3 font-bold text-slate-800">
                    {item.quantity} x {name}
                  </td>
                  <td className="p-3 text-right text-slate-400 font-bold">{money(rate)}</td>
                  <td className="p-3 text-right text-slate-800 font-extrabold">{money(item.quantity * rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Block */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500 font-bold">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 font-bold">
            <span>CGST (9%)</span>
            <span>{money(cgst)}</span>
          </div>
          <div className="flex justify-between text-slate-500 font-bold">
            <span>SGST (9%)</span>
            <span>{money(sgst)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>GRAND TOTAL</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>

      {/* Scan to Pay QR Code */}
      <div className="vx-card text-center p-5 flex flex-col items-center border border-slate-200/80">
        <div className="flex items-center gap-1.5 mb-3">
          <QrCode size={16} className="text-indigo-600" />
          <h4 className="text-xs font-black text-slate-900 m-0">Scan to Pay</h4>
        </div>
        <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm inline-block">
          <img
            src={qrCodeImgSrc}
            alt="UPI QR Code"
            className="w-[180px] h-[180px]"
          />
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-2.5">
          Scan using GPay, PhonePe, Paytm, or any BHIM UPI app
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || printing || sharing}
            onClick={handlePrint}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-60"
          >
            <Printer size={16} /> {printing ? "Printing..." : "Print"}
          </button>

          {canShare && (
            <button
              type="button"
              disabled={saving || printing || sharing}
              onClick={handleShare}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-60"
            >
              <Share2 size={16} /> {sharing ? "Sharing..." : "Share"}
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={saving || printing || sharing}
          onClick={handleSave}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-60"
        >
          {saving ? "Creating Invoice..." : "Complete & Save Invoice"}
        </button>
      </div>
    </div>
  );
}
