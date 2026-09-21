import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Printer,
  Save,
  RotateCcw,
  Eye,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Palette,
  Layout,
  Sliders,
  FileText,
  Table,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import InvoiceTemplateRenderer from "../../components/printing/InvoiceTemplateRenderer";
import {
  PDF_FORMAT_OPTIONS,
  A4_TEMPLATE_TYPES,
  THERMAL_TEMPLATE_TYPES,
  INVOICE_TEMPLATES,
  ACCENT_COLOR_PALETTES,
  DEFAULT_PRINT_SETTINGS,
  SAMPLE_INVOICE_DATA,
  TRANSACTION_TYPES,
  getTransactionTypeMeta,
  getSampleDataForTransactionType,
  loadPrintFormatSettings,
  savePrintFormatSettings,
} from "../../utils/printFormatDefaults";

export default function ReceiptFormatsDesigner() {
  const [settings, setSettings] = useState(loadPrintFormatSettings);
  const [activeDrawer, setActiveDrawer] = useState(null); // 'template' | 'customise' | 'header' | 'table' | 'footer' | null
  const [zoomLevel, setZoomLevel] = useState(85); // percentage zoom for preview canvas
  const [txnDropdownOpen, setTxnDropdownOpen] = useState(false);
  const txnDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (txnDropdownRef.current && !txnDropdownRef.current.contains(event.target)) {
        setTxnDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeTxnMeta = useMemo(
    () => getTransactionTypeMeta(settings.transactionType),
    [settings.transactionType]
  );

  const sampleDataForPreview = useMemo(
    () => getSampleDataForTransactionType(settings.transactionType, SAMPLE_INVOICE_DATA),
    [settings.transactionType]
  );

  const handleSelectTransactionType = (typeId) => {
    const targetMeta = getTransactionTypeMeta(typeId);
    const prevMeta = getTransactionTypeMeta(settings.transactionType);

    setSettings((prev) => {
      const currentTitle = prev.header?.documentTitle;
      const shouldUpdateTitle = !currentTitle || currentTitle === prevMeta.documentTitle;
      const currentSubtitle = prev.header?.documentSubtitle;
      const shouldUpdateSubtitle = !currentSubtitle || currentSubtitle === prevMeta.documentSubtitle;

      return {
        ...prev,
        transactionType: typeId,
        header: {
          ...prev.header,
          documentTitle: shouldUpdateTitle ? targetMeta.documentTitle : currentTitle,
          documentSubtitle: shouldUpdateSubtitle ? targetMeta.documentSubtitle : currentSubtitle,
        },
      };
    });
    setTxnDropdownOpen(false);
  };

  const isThermalFormat =
    settings.pdfFormat === "thermal" || settings.templateType === "standard_thermal";
  const availableTemplates = isThermalFormat ? THERMAL_TEMPLATE_TYPES : A4_TEMPLATE_TYPES;

  useEffect(() => {
    // Keep orientation and template synchronized if landscape dual chosen
    if (settings.template === "landscape_dual" && settings.orientation !== "landscape") {
      setSettings((prev) => ({ ...prev, orientation: "landscape" }));
    }
  }, [settings.template]);

  const handleSave = () => {
    const success = savePrintFormatSettings(settings);
    if (success) {
      toast.success("Print & Invoice format settings saved successfully!");
    } else {
      toast.error("Failed to save print format settings.");
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all invoice format customizations to system defaults?")) {
      setSettings(DEFAULT_PRINT_SETTINGS);
      savePrintFormatSettings(DEFAULT_PRINT_SETTINGS);
      toast.info("Invoice format reset to factory defaults.");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("vynerix-printable-invoice");
    if (!printContent) {
      window.print();
      return;
    }

    // Build custom print iframe or trigger window.print with targeted @page styling
    const isLandscape = settings.orientation === "landscape";
    const isThermal = settings.pageSize === "2inch" || settings.pageSize === "3inch";
    const pageCss = isThermal
      ? `@page { size: ${settings.pageSize === "2inch" ? "58mm" : "80mm"} auto; margin: 0; }`
      : `@page { size: ${settings.pageSize} ${isLandscape ? "landscape" : "portrait"}; margin: 0; }`;

    const printStyle = document.createElement("style");
    printStyle.id = "print-override-style";
    printStyle.innerHTML = `
      ${pageCss}
      @media print {
        body * { visibility: hidden !important; }
        #vynerix-printable-invoice, #vynerix-printable-invoice * { visibility: visible !important; }
        #vynerix-printable-invoice {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: ${settings.margins?.top || 6}mm ${settings.margins?.right || 8}mm ${settings.margins?.bottom || 6}mm ${settings.margins?.left || 8}mm !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("print-override-style");
      if (el) el.remove();
    }, 1000);
  };

  // Helper toggle functions
  const toggleHeaderField = (field) => {
    setSettings((prev) => ({
      ...prev,
      header: { ...prev.header, [field]: !prev.header[field] },
    }));
  };

  const toggleFooterField = (field) => {
    setSettings((prev) => ({
      ...prev,
      footer: { ...prev.footer, [field]: !prev.footer[field] },
    }));
  };

  const toggleColumn = (colId) => {
    setSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === colId ? { ...col, enabled: !col.enabled } : col
      ),
    }));
  };

  const setAllColumns = (enabled) => {
    setSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => ({ ...col, enabled })),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* TOP TITLE & ACTION BAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Invoice & Receipt Print Formats
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {settings.orientation.toUpperCase()} &bull; {settings.pageSize}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure A4/A5 document invoices and thermal POS receipts with live preview & print styling
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-xs border border-slate-200 dark:border-slate-700 mr-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition text-slate-600 dark:text-slate-300"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-slate-700 dark:text-slate-300 font-semibold">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition text-slate-600 dark:text-slate-300"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(85)}
              className="px-1.5 py-0.5 hover:bg-white dark:hover:bg-slate-700 rounded transition text-[10px] text-slate-500"
              title="Reset Zoom"
            >
              Fit
            </button>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Test Print</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-indigo-500/20 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Format</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN WORKSPACE: CONTROLS (LEFT) & LIVE CANVAS (RIGHT) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT CONTROL SIDEBAR (Swayam Bill Book Replica) */}
        <div className="w-80 sm:w-88 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto z-10 shadow-sm">
          <div className="p-4 space-y-4">
            {/* 1. Template Type Dropdown (Swayam Bill Book dynamic template types) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Template Type
              </label>
              <select
                value={settings.template}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings((prev) => ({
                    ...prev,
                    template: val,
                    orientation: val === "landscape_dual" ? "landscape" : prev.orientation,
                  }));
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Transaction Type Dropdown (Swayam / Vyapar replica matching exact screenshot) */}
            <div className="relative pt-1" ref={txnDropdownRef}>
              <div
                onClick={() => setTxnDropdownOpen((o) => !o)}
                className="relative cursor-pointer border-2 border-indigo-600 dark:border-indigo-500 rounded-lg px-3.5 pt-3 pb-2.5 bg-white dark:bg-slate-900 transition shadow-xs hover:border-indigo-700 select-none flex items-center justify-between"
              >
                {/* Floating Outlined Label in border notch */}
                <span className="absolute -top-2.5 left-2.5 bg-white dark:bg-slate-900 px-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Transaction Type
                </span>

                {/* Selected Text */}
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {activeTxnMeta.name}
                </span>

                {/* Arrow Icon */}
                {txnDropdownOpen ? (
                  <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
                )}
              </div>

              {/* Dropdown Menu Popup */}
              {txnDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl z-40 overflow-hidden py-1 animate-in fade-in-50 zoom-in-95 duration-150">
                  {TRANSACTION_TYPES.map((t) => {
                    const isSelected = settings.transactionType === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTransactionType(t.id)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-[#4338ca] text-white font-semibold"
                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        }`}
                      >
                        <span>{t.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. PDF Format Dropdown (All 7 Swayam formats: A4, A5, Thermal Print, Landscape A4, Landscape A5, Letter Head, A4 Half) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                PDF Format
              </label>
              <select
                value={settings.pdfFormat}
                onChange={(e) => {
                  const fmtId = e.target.value;
                  const selectedOpt = PDF_FORMAT_OPTIONS.find((f) => f.id === fmtId) || PDF_FORMAT_OPTIONS[0];
                  const nowThermal = selectedOpt.isThermal;

                  setSettings((prev) => {
                    let newTemplate = prev.template;
                    if (nowThermal) {
                      const isCurrentThermal = THERMAL_TEMPLATE_TYPES.some((t) => t.id === prev.template);
                      if (!isCurrentThermal) newTemplate = "standard_thermal";
                    } else {
                      const isCurrentA4 = A4_TEMPLATE_TYPES.some((t) => t.id === prev.template);
                      if (!isCurrentA4) newTemplate = "general";
                    }

                    return {
                      ...prev,
                      pdfFormat: fmtId,
                      pageSize: selectedOpt.pageSize,
                      orientation: selectedOpt.orientation,
                      templateType: nowThermal ? "standard_thermal" : "standard_a4",
                      template: newTemplate,
                    };
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {PDF_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Page Size & Format Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Page Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {settings.pdfFormat === "thermal" ? (
                  <>
                    {["2inch", "3inch", "4inch"].map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSettings((prev) => ({ ...prev, pageSize: sz }))}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          settings.pageSize === sz
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {sz === "2inch" ? "2 inch (58mm)" : sz === "3inch" ? "3 inch (80mm)" : "4 inch"}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {["A4", "A5", "Letter"].map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSettings((prev) => ({ ...prev, pageSize: sz }))}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          settings.pageSize === sz
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* 5. Orientation Switch (PORTRAIT vs LANDSCAPE) */}
            {settings.pdfFormat !== "thermal" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Orientation
                  </label>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    {settings.orientation === "landscape" ? "Wide Layout" : "Vertical Layout"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, orientation: "portrait" }))}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition ${
                      settings.orientation === "portrait"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="w-3.5 h-4.5 border border-current rounded-xs" />
                    <span>Portrait</span>
                  </button>

                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, orientation: "landscape" }))}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition ${
                      settings.orientation === "landscape"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="w-4.5 h-3.5 border border-current rounded-xs" />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

            {/* 6. Navigation Buttons matching Swayam Bill Book screenshot */}
            <div className="space-y-3 pt-2">
              {[
                { id: "template", label: "Invoice Template" },
                { id: "customise", label: "Customize Format" },
                { id: "header", label: "Header Settings" },
                { id: "table", label: "Table Settings" },
                { id: "footer", label: "Footer Settings" },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveDrawer(activeDrawer === item.id ? null : item.id)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition select-none group ${
                    activeDrawer === item.id
                      ? "bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-bold text-[#4338ca] dark:text-indigo-400 text-[15px] group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
                    {item.label}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#4f46e5] hover:bg-[#4338ca] text-white flex items-center justify-center shadow-xs transition transform group-hover:scale-110 shrink-0">
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE-OUT DRAWER / MODAL PANELS */}
        {/* ========================================================================= */}
        {activeDrawer && (
          <div className="absolute top-0 bottom-0 left-80 sm:left-88 w-96 max-w-[calc(100vw-360px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-20 flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 capitalize">
                {activeDrawer === "template"
                  ? "Select Invoice Template"
                  : activeDrawer === "customise"
                  ? "Customization & Styling"
                  : activeDrawer === "header"
                  ? "Header Settings"
                  : activeDrawer === "table"
                  ? "Table Columns"
                  : "Footer Settings"}
              </h2>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* DRAWER 1: TEMPLATE SELECTOR */}
              {activeDrawer === "template" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose an invoice layout tailored for standard Indian GST tax invoices or high-density retail vouchers:
                  </p>
                  {availableTemplates.map((tmpl) => {
                    const isSelected = settings.template === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            template: tmpl.id,
                            orientation: tmpl.id === "landscape_dual" ? "landscape" : prev.orientation,
                          }));
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition relative group ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {tmpl.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tmpl.badgeColor}`}>
                            {tmpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {tmpl.description}
                        </p>

                        <div className="mt-2 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] font-medium text-slate-400">
                            {tmpl.id === "landscape_dual" ? "Wide Format" : "Portrait / Landscape"}
                          </span>
                          {isSelected ? (
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600 dark:text-slate-300">
                              Select &rarr;
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DRAWER 2: CUSTOMIZE FORMAT */}
              {activeDrawer === "customise" && (
                <div className="space-y-4">
                  {/* Accent Colour */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                      Accent Colour
                    </label>
                    <div className="flex flex-wrap gap-2.5 items-center">
                      {ACCENT_COLOR_PALETTES.map((pal) => (
                        <button
                          key={pal.hex}
                          onClick={() => setSettings((prev) => ({ ...prev, accentColor: pal.hex }))}
                          title={pal.name}
                          className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                            settings.accentColor === pal.hex
                              ? "ring-2 ring-offset-2 ring-indigo-500 scale-105"
                              : "opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: pal.hex }}
                        >
                          {settings.accentColor === pal.hex && (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          )}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-1">
                        <input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => setSettings((prev) => ({ ...prev, accentColor: e.target.value }))}
                          className="w-7 h-7 rounded cursor-pointer border border-slate-300 dark:border-slate-600"
                        />
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                          {settings.accentColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Watermark Section */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Show Watermark
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.watermark?.enabled || false}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            watermark: { ...prev.watermark, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {settings.watermark?.enabled && (
                      <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                            Watermark Text
                          </label>
                          <input
                            type="text"
                            value={settings.watermark?.text || ""}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                watermark: { ...prev.watermark, text: e.target.value },
                              }))
                            }
                            placeholder="e.g. VYNERIX ERP or FIRM NAME"
                            className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                            <span>Opacity</span>
                            <span>{settings.watermark?.opacity || 12}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="40"
                            value={settings.watermark?.opacity || 12}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                watermark: { ...prev.watermark, opacity: Number(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Margins */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                      Print Margins (mm)
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500">Top:</span>
                        <input
                          type="number"
                          value={settings.margins?.top || 6}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              margins: { ...prev.margins, top: Number(e.target.value) },
                            }))
                          }
                          className="w-full mt-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500">Bottom:</span>
                        <input
                          type="number"
                          value={settings.margins?.bottom || 6}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              margins: { ...prev.margins, bottom: Number(e.target.value) },
                            }))
                          }
                          className="w-full mt-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DRAWER 3: HEADER SETTINGS */}
              {activeDrawer === "header" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Header Elements
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {[
                      { key: "showCompanyName", label: "Company Name" },
                      { key: "showMobile", label: "Mobile / Phone Number" },
                      { key: "showEmail", label: "Email Address" },
                      { key: "showGstin", label: "GSTIN Number" },
                      { key: "showPan", label: "PAN Number" },
                      { key: "showState", label: "State & State Code" },
                      { key: "showDueDate", label: "Payment Due Date" },
                      { key: "showReverseCharge", label: "Reverse Charge Indicator" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={settings.header?.[item.key] !== false}
                          onChange={() => toggleHeaderField(item.key)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                      Transaction & Dispatch Details
                    </span>
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      {[
                        { key: "showTransport", label: "Transport & LR Details" },
                        { key: "showPo", label: "Purchase Order (PO) Details" },
                        { key: "showEway", label: "E-Way Bill Details" },
                        { key: "showShipTo", label: "Ship To (Consignee) Address" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
                        >
                          <span>{item.label}</span>
                          <input
                            type="checkbox"
                            checked={settings.header?.[item.key] !== false}
                            onChange={() => toggleHeaderField(item.key)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DRAWER 4: TABLE SETTINGS */}
              {activeDrawer === "table" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Item Table Columns
                    </span>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setAllColumns(true)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Show all
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => setAllColumns(false)}
                        className="text-slate-500 hover:underline"
                      >
                        Hide all
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enable or disable columns displayed on the printed invoice:
                  </p>

                  <div className="space-y-1.5">
                    {settings.columns.map((col, idx) => (
                      <div
                        key={col.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                          col.enabled
                            ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400 line-through opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-mono text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{col.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={col.enabled}
                          onChange={() => toggleColumn(col.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DRAWER 5: FOOTER SETTINGS */}
              {activeDrawer === "footer" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Footer Elements
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {[
                      { key: "showHsnSummary", label: "HSN / SAC Summary Table" },
                      { key: "showInWords", label: "Amount in Words" },
                      { key: "showBankDetails", label: "Bank Account Details & UPI" },
                      { key: "showSavings", label: "Savings Highlight ('You Saved ₹XX')" },
                      { key: "showOutstanding", label: "Customer Outstanding Balance" },
                      { key: "showSignatory", label: "Authorized Signatory Block" },
                      { key: "showCustomerSign", label: "Customer Signature Line" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={settings.footer?.[item.key] !== false}
                          onChange={() => toggleFooterField(item.key)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Terms Textarea */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Terms & Conditions
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.footer?.showTerms !== false}
                        onChange={() => toggleFooterField("showTerms")}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                    </div>
                    {settings.footer?.showTerms !== false && (
                      <textarea
                        rows={3}
                        value={settings.footer?.termsText || ""}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            footer: { ...prev.footer, termsText: e.target.value },
                          }))
                        }
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="Enter terms and conditions..."
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Bar (Swayam Bill Book style: Save, Back, and Reset to original) */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSave();
                    setActiveDrawer(null);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-lg shadow-sm transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition"
                >
                  Back
                </button>
              </div>

              {activeDrawer === "customise" && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium"
                >
                  Reset to original
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CENTER / RIGHT REAL-TIME WYSIWYG PREVIEW CANVAS */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-200 dark:bg-slate-950/80">
          {/* Format Canvas Banner */}
          <div className="mb-3 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-3 shadow-xs">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" /> Live WYSIWYG Preview
            </span>
            <span>&bull;</span>
            <span>
              {settings.pageSize}{" "}
              {settings.orientation === "landscape" ? "Landscape (297 × 210 mm)" : "Portrait (210 × 297 mm)"}
            </span>
            <span>&bull;</span>
            <span className="capitalize">{settings.template} Template</span>
          </div>

          {/* Scaled Preview Wrapper */}
          <div
            className="transition-transform duration-200 origin-top"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              marginBottom: "100px",
            }}
          >
            <InvoiceTemplateRenderer
              settings={settings}
              data={sampleDataForPreview}
              isPrintMode={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
