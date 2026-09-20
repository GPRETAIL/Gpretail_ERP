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
import { Box, Typography } from "@mui/material";
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
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearching, setCustomerSearching] = useState(false);
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
          api.get("/customers", { params: { limit: 300 } }),
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

  // Only the first 300 customers are preloaded (real table can hold ~1,000,000 rows) -- this is a
  // progressive enhancement, not a hard requirement: when offline the request just fails silently
  // and the picker below still works with whatever's cached/preloaded, same as before this fix.
  useEffect(() => {
    const query = customerSearchTerm.trim();
    if (query.length < 3) return undefined;
    setCustomerSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/customers", { params: { search: query, limit: 30 } });
        const results = res.data?.data || [];
        if (results.length) {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => String(c.id)));
            const newOnes = results.filter((c) => !existingIds.has(String(c.id)));
            return newOnes.length ? [...prev, ...newOnes] : prev;
          });
        }
      } catch {
        // Offline or request failed -- silently keep whatever's already loaded/cached.
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

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
      <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", position: "relative", overflow: "hidden", bgcolor: "#0f172a" }}>

        {/* Alerts Block */}
        {errorMsg && (
          <Box className="animate-bounce" sx={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 50, p: 1.25, borderRadius: "12px", bgcolor: "#f43f5e", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center", boxShadow: 2 }}>
            {errorMsg}
          </Box>
        )}
        {successMsg && (
          <Box className="animate-pulse" sx={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 50, p: 1.25, borderRadius: "12px", bgcolor: "#10b981", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center", boxShadow: 2 }}>
            {successMsg}
          </Box>
        )}

        {/* ─── SCANNER VIEW (TOP 40%) ─── */}
        <Box
          sx={{ position: "relative", width: "100%", overflow: "hidden", bgcolor: "#000", flexShrink: 0, flexBasis: "calc((100vh - 64px) * 0.4)" }}
        >

          {/* Header Action Bar */}
          <Box sx={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box
              component="button"
              type="button"
              onClick={onBack}
              sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", "&:active": { transform: "scale(0.9)" } }}
            >
              <ChevronLeft size={20} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                component="button"
                type="button"
                onClick={handleToggleTorch}
                sx={{
                  width: 36, height: 36, borderRadius: "50%", border: "1px solid", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", "&:active": { transform: "scale(0.9)" },
                  bgcolor: torchOn ? "#f59e0b" : "rgba(0,0,0,0.4)",
                  borderColor: torchOn ? "#f59e0b" : "rgba(255,255,255,0.2)",
                }}
              >
                {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setCameraOn(!cameraOn)}
                sx={{
                  width: 36, height: 36, borderRadius: "50%", border: "1px solid", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", "&:active": { transform: "scale(0.9)" },
                  bgcolor: cameraOn ? "rgba(0,0,0,0.4)" : "#f43f5e",
                  borderColor: cameraOn ? "rgba(255,255,255,0.2)" : "#f43f5e",
                }}
              >
                {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
              </Box>
            </Box>
          </Box>

          {/* Camera Video Stream */}
          {cameraOn ? (
            <Box
              component="video"
              ref={videoRef}
              playsInline
              muted
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#1e293b", textAlign: "center", px: 2 }}>
              <CameraOff size={32} style={{ color: "#64748b", marginBottom: 8 }} />
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700 }}>Camera is turned off</Typography>
              <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", mt: 0.5 }}>Turn on camera or use search below to add items.</Typography>
            </Box>
          )}

          {/* Green Corner Scanner Bounding Box */}
          {cameraOn && (
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box sx={{ width: 180, height: 180, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", position: "relative" }}>
                {/* 4 neon green corners */}
                <Box sx={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTop: "4px solid #34d399", borderLeft: "4px solid #34d399", borderTopLeftRadius: "8px" }} />
                <Box sx={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "4px solid #34d399", borderRight: "4px solid #34d399", borderTopRightRadius: "8px" }} />
                <Box sx={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "4px solid #34d399", borderLeft: "4px solid #34d399", borderBottomLeftRadius: "8px" }} />
                <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottom: "4px solid #34d399", borderRight: "4px solid #34d399", borderBottomRightRadius: "8px" }} />
              </Box>
            </Box>
          )}
        </Box>

        {/* ─── BOTTOM PANEL (BOTTOM 60%) ─── */}
        <Box sx={{ flex: 1, bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

          {/* Drag Handle Style Bar */}
          <Box sx={{ width: 48, height: 4, bgcolor: "#e2e8f0", borderRadius: "999px", mx: "auto", my: 1.5, flexShrink: 0 }} />

          {/* Search/Lookup Row */}
          <Box sx={{ px: 2, pb: 1, position: "relative", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#f1f5f9", border: "1px solid rgba(226,232,240,0.8)", px: 1.5, py: 1, borderRadius: "16px" }}>
              <Search size={16} style={{ color: "#94a3b8" }} />
              <Box
                component="input"
                type="text"
                placeholder="Search catalog or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: "100%", bgcolor: "transparent", fontSize: 12, color: "#1e293b", outline: "none", fontWeight: 700 }}
              />
            </Box>

            {/* Filtered Search Results Box */}
            {searchQuery.trim() !== "" && (
              <Box sx={{ position: "absolute", left: 16, right: 16, top: "100%", mt: 0.5, bgcolor: "#fff", border: "1px solid #e2e8f0", boxShadow: 8, borderRadius: "16px", maxHeight: 160, overflowY: "auto", zIndex: 40, "& > *:not(:first-of-type)": { borderTop: "1px solid #f1f5f9" } }}>
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.map((prod) => (
                    <Box
                      key={prod.id}
                      onClick={() => handleSearchSelect(prod)}
                      sx={{ p: 1.5, fontSize: 12, fontWeight: 700, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", "&:active": { bgcolor: "#f8fafc" } }}
                    >
                      <Box>
                        <Box component="span">{prod.productName || prod.name}</Box>
                        <Box component="span" sx={{ fontSize: 10, color: "#94a3b8", display: "block", fontFamily: "monospace" }}>{prod.productCode || prod.sku}</Box>
                      </Box>
                      <Box component="span" sx={{ color: "#4f46e5" }}>{money(prod.selling_price)}</Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ p: 1.5, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No items found</Box>
                )}
              </Box>
            )}
          </Box>

          {/* Title and Summary Header */}
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box>
              <Typography component="h3" sx={{ fontSize: 12, fontWeight: 800, color: "#0f172a", m: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>Scanned Items</Typography>
              <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", m: 0, fontWeight: 700 }}>{totalItemsCount} items total</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography component="span" sx={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Subtotal</Typography>
              <Typography component="span" sx={{ fontSize: 14, fontWeight: 900, color: "#4f46e5" }}>{money(subtotal)}</Typography>
            </Box>
          </Box>

          {/* Cart Items List */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1, pb: 12 }}>
            {cartItems.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {cartItems.map((item) => {
                  const name = item.product.productName || item.product.name;
                  const rate = Number(item.product.selling_price || 0);
                  return (
                    <Box key={item.product.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", borderRadius: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                          {name.charAt(0).toUpperCase()}
                        </Box>
                        <Box>
                          <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#1e293b", m: 0, lineHeight: 1.25 }}>{name}</Typography>
                          <Typography component="span" sx={{ fontSize: 10, color: "#94a3b8", display: "block", fontWeight: 700, mt: 0.25 }}>{money(rate)}</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {/* Decrement */}
                        <Box
                          component="button"
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", "&:active": { bgcolor: "#f1f5f9" } }}
                        >
                          <Minus size={14} />
                        </Box>
                        <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#1e293b", width: 16, textAlign: "center" }}>{item.quantity}</Typography>
                        {/* Increment */}
                        <Box
                          component="button"
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", "&:active": { bgcolor: "#f1f5f9" } }}
                        >
                          <Plus size={14} />
                        </Box>
                        {/* Remove */}
                        <Box
                          component="button"
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", ml: 0.5, "&:active": { bgcolor: "#ffe4e6" } }}
                        >
                          <Trash2 size={14} />
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", py: 5 }}>
                <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5, boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.06)" }}>
                  <ShoppingBasket size={30} />
                </Box>
                <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#334155", m: 0 }}>Bill List is Empty</Typography>
                <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", maxWidth: 200, mx: "auto", mt: 0.5 }}>
                  Scanned products will show up here. Use the camera reader above to begin.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Sticky Checkout Review Action */}
          <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 2, bgcolor: "rgba(255,255,255,0.95)", borderTop: "1px solid #f1f5f9", zIndex: 10 }}>
            <Box
              component="button"
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setStep("checkout")}
              sx={{
                width: "100%", py: 1.75, borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5,
                color: "#fff", fontWeight: 800, fontSize: 12, transition: "all 0.15s", "&:active": { transform: "scale(0.98)" },
                bgcolor: cartItems.length === 0 ? "#cbd5e1" : "#4f46e5",
                boxShadow: cartItems.length === 0 ? "none" : "0 4px 6px -1px rgba(79,70,229,0.2)",
                cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Box component="span">REVIEW BILL ({totalItemsCount})</Box>
              <Box component="span" sx={{ fontSize: 14, fontWeight: 900 }}>{money(total)}</Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Return step 2: Checkout, Receipt, UPI scan & pay
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      {successMsg && (
        <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <Check size={16} />
          <Box component="span">{successMsg}</Box>
        </Box>
      )}

      {/* Header Info */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          component="button"
          type="button"
          onClick={() => setStep("billing")}
          sx={{ width: 32, height: 32, borderRadius: "12px", bgcolor: "#f1f5f9", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
        >
          <ChevronLeft size={16} />
        </Box>
        <Box>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", m: 0 }}>Checkout Summary</Typography>
          <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", m: 0, fontWeight: 700 }}>Review payment details & print</Typography>
        </Box>
      </Box>

      {/* Customer Selector */}
      <Box className="vx-card">
        <Typography component="label" sx={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", mb: 0.5 }}>
          Select Customer
        </Typography>
        <Box
          component="input"
          type="text"
          value={customerSearchTerm}
          onChange={(e) => setCustomerSearchTerm(e.target.value)}
          placeholder={customerSearching ? "Searching..." : "Search customer by name or phone..."}
          sx={{ width: "100%", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", p: 1.25, fontSize: 12, color: "#1e293b", outline: "none", mb: 0.75 }}
        />
        <Box
          component="select"
          sx={{ width: "100%", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", p: 1.25, fontSize: 12, color: "#1e293b", outline: "none", fontWeight: 700 }}
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">Walking Customer ▾</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Box>
      </Box>

      {/* Receipt Details Table */}
      <Box className="vx-card overflow-hidden !p-0 border border-slate-200/80">
        <Box component="table" sx={{ width: "100%", fontSize: 12, color: "#334155", borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <Box component="th" sx={{ p: 1.5, textAlign: "left", fontWeight: 800, textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Product Name</Box>
              <Box component="th" sx={{ p: 1.5, textAlign: "right", fontWeight: 800, textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Rate</Box>
              <Box component="th" sx={{ p: 1.5, textAlign: "right", fontWeight: 800, textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Total</Box>
            </Box>
          </Box>
          <Box component="tbody" sx={{ "& > *:not(:first-of-type)": { borderTop: "1px solid #f1f5f9" } }}>
            {cartItems.map((item) => {
              const name = item.product.productName || item.product.name;
              const rate = Number(item.product.selling_price || 0);
              return (
                <Box component="tr" key={item.product.id}>
                  <Box component="td" sx={{ p: 1.5, fontWeight: 700, color: "#1e293b" }}>
                    {item.quantity} x {name}
                  </Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: "right", color: "#94a3b8", fontWeight: 700 }}>{money(rate)}</Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: "right", color: "#1e293b", fontWeight: 800 }}>{money(item.quantity * rate)}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Summary Block */}
        <Box sx={{ p: 2, bgcolor: "rgba(248,250,252,0.5)", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 0.75, fontSize: 12 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontWeight: 700 }}>
            <Box component="span">Subtotal</Box>
            <Box component="span">{money(subtotal)}</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontWeight: 700 }}>
            <Box component="span">CGST (9%)</Box>
            <Box component="span">{money(cgst)}</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontWeight: 700 }}>
            <Box component="span">SGST (9%)</Box>
            <Box component="span">{money(sgst)}</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, color: "#0f172a", pt: 1, borderTop: "1px solid #e2e8f0" }}>
            <Box component="span">GRAND TOTAL</Box>
            <Box component="span">{money(total)}</Box>
          </Box>
        </Box>
      </Box>

      {/* Scan to Pay QR Code */}
      <Box className="vx-card text-center p-5 flex flex-col items-center border border-slate-200/80">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
          <QrCode size={16} style={{ color: "#4f46e5" }} />
          <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", m: 0 }}>Scan to Pay</Typography>
        </Box>
        <Box sx={{ p: 1, borderRadius: "16px", bgcolor: "#fff", border: "1px solid #e2e8f0", boxShadow: 1, display: "inline-block" }}>
          <Box
            component="img"
            src={qrCodeImgSrc}
            alt="UPI QR Code"
            sx={{ width: 180, height: 180 }}
          />
        </Box>
        <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, mt: 1.25 }}>
          Scan using GPay, PhonePe, Paytm, or any BHIM UPI app
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box
            component="button"
            type="button"
            disabled={saving || printing || sharing}
            onClick={handlePrint}
            sx={{
              flex: 1, py: 1.5, bgcolor: "#fff", border: "1px solid #e2e8f0", color: "#334155", borderRadius: "16px", fontWeight: 800, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 1, transition: "all 0.15s",
              "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.98)" }, "&:disabled": { opacity: 0.6 },
            }}
          >
            <Printer size={16} /> {printing ? "Printing..." : "Print"}
          </Box>

          {canShare && (
            <Box
              component="button"
              type="button"
              disabled={saving || printing || sharing}
              onClick={handleShare}
              sx={{
                flex: 1, py: 1.5, bgcolor: "#fff", border: "1px solid #e2e8f0", color: "#334155", borderRadius: "16px", fontWeight: 800, fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 1, transition: "all 0.15s",
                "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.98)" }, "&:disabled": { opacity: 0.6 },
              }}
            >
              <Share2 size={16} /> {sharing ? "Sharing..." : "Share"}
            </Box>
          )}
        </Box>

        <Box
          component="button"
          type="button"
          disabled={saving || printing || sharing}
          onClick={handleSave}
          sx={{
            width: "100%", py: 1.75, bgcolor: "#4f46e5", color: "#fff", borderRadius: "16px", fontWeight: 800, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 1, boxShadow: "0 4px 6px -1px rgba(79,70,229,0.1)", transition: "all 0.15s",
            "&:hover": { bgcolor: "#4338ca" }, "&:active": { transform: "scale(0.98)" }, "&:disabled": { opacity: 0.6 },
          }}
        >
          {saving ? "Creating Invoice..." : "Complete & Save Invoice"}
        </Box>
      </Box>
    </Box>
  );
}
