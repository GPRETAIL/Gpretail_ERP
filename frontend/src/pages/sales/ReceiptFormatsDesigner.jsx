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
import { Box, Stack, Typography, Button, IconButton, TextField, Checkbox, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#020617" : "#f1f5f9", display: "flex", flexDirection: "column" }}>
      {/* ========================================================================= */}
      {/* TOP TITLE & ACTION BAR */}
      {/* ========================================================================= */}
      <Stack
        direction="row"
        sx={{
          bgcolor: isDark ? "#0f172a" : "#ffffff",
          borderBottom: "1px solid",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          px: "21px",
          py: "12.25px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
        }}
      >
        <Box>
          <Stack direction="row" sx={{ alignItems: "center", gap: "7px" }}>
            <Box
              component="span"
              sx={{
                p: "5.25px",
                borderRadius: "7px",
                bgcolor: isDark ? "#1e1b4b" : "#eef2ff",
                color: isDark ? "#818cf8" : "#4f46e5",
                display: "inline-flex",
              }}
            >
              <Printer size={17.5} />
            </Box>
            <Typography component="h1" sx={{ fontSize: 17.5, fontWeight: 700, color: isDark ? "#ffffff" : "#0f172a" }}>
              Invoice & Receipt Print Formats
            </Typography>
            <Box
              component="span"
              sx={{
                fontSize: 10.5,
                px: "8.75px",
                py: "1.75px",
                borderRadius: "9999px",
                fontWeight: 500,
                bgcolor: isDark ? "#022c22" : "#d1fae5",
                color: isDark ? "#6ee7b7" : "#065f46",
              }}
            >
              {settings.orientation.toUpperCase()} &bull; {settings.pageSize}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 10.5, color: isDark ? "#94a3b8" : "#64748b", mt: "1.75px" }}>
            Configure A4/A5 document invoices and thermal POS receipts with live preview & print styling
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" sx={{ alignItems: "center", gap: "7px" }}>
          {/* Zoom controls */}
          <Stack
            direction="row"
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              borderRadius: "7px",
              p: "3.5px",
              fontSize: 10.5,
              border: "1px solid",
              borderColor: isDark ? "#334155" : "#e2e8f0",
              mr: "7px",
            }}
          >
            <IconButton
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
              title="Zoom out"
              size="small"
              sx={{ p: "3.5px", borderRadius: "3.5px", color: isDark ? "#cbd5e1" : "#475569" }}
            >
              <ZoomOut size={12.25} />
            </IconButton>
            <Typography component="span" sx={{ px: "7px", fontFamily: "monospace", color: isDark ? "#cbd5e1" : "#334155", fontWeight: 600 }}>
              {zoomLevel}%
            </Typography>
            <IconButton
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
              title="Zoom in"
              size="small"
              sx={{ p: "3.5px", borderRadius: "3.5px", color: isDark ? "#cbd5e1" : "#475569" }}
            >
              <ZoomIn size={12.25} />
            </IconButton>
            <Button
              onClick={() => setZoomLevel(85)}
              title="Reset Zoom"
              sx={{ px: "5.25px", py: "1.75px", fontSize: 10, color: "#64748b", textTransform: "none", minWidth: "auto" }}
            >
              Fit
            </Button>
          </Stack>

          <Button
            onClick={handleReset}
            startIcon={<RotateCcw size={12.25} />}
            sx={{
              fontSize: 10.5,
              fontWeight: 600,
              color: isDark ? "#e2e8f0" : "#334155",
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              "&:hover": { bgcolor: isDark ? "#334155" : "#e2e8f0" },
              borderRadius: "7px",
              px: "10.5px",
              py: "7px",
              textTransform: "none",
            }}
          >
            Reset
          </Button>

          <Button
            onClick={handlePrint}
            startIcon={<Printer size={12.25} style={{ color: isDark ? "#818cf8" : "#4f46e5" }} />}
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              color: isDark ? "#f1f5f9" : "#1e293b",
              bgcolor: isDark ? "#1e293b" : "#ffffff",
              "&:hover": { bgcolor: isDark ? "#334155" : "#f8fafc" },
              border: "1px solid",
              borderColor: isDark ? "#475569" : "#cbd5e1",
              borderRadius: "7px",
              px: "14px",
              py: "7px",
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
              textTransform: "none",
            }}
          >
            Test Print
          </Button>

          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<Save size={12.25} />}
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              borderRadius: "7px",
              px: "17.5px",
              py: "7px",
              boxShadow: 2,
              textTransform: "none",
            }}
          >
            Save Format
          </Button>
        </Stack>
      </Stack>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN WORKSPACE: CONTROLS (LEFT) & LIVE CANVAS (RIGHT) */}
      {/* ========================================================================= */}
      <Box sx={{ flex: "1 1 0%", display: "flex", overflow: "hidden", position: "relative" }}>
        {/* LEFT CONTROL SIDEBAR (Swayam Bill Book Replica) */}
        <Box
          sx={{
            width: { xs: 280, sm: 308 },
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            borderRight: "1px solid",
            borderColor: isDark ? "#1e293b" : "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflowY: "auto",
            zIndex: 10,
            boxShadow: 1,
          }}
        >
          <Box sx={{ p: "14px", "& > * + *": { mt: "14px" } }}>
            {/* 1. Template Type Dropdown (Swayam Bill Book dynamic template types) */}
            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em", mb: "5.25px" }}>
                Template Type
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={settings.template}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings((prev) => ({
                    ...prev,
                    template: val,
                    orientation: val === "landscape_dual" ? "landscape" : prev.orientation,
                  }));
                }}
                sx={{ "& .MuiInputBase-input": { fontSize: 10.5, fontWeight: 500 } }}
              >
                {availableTemplates.map((tmpl) => (
                  <MenuItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 2. Transaction Type Dropdown (Swayam / Vyapar replica matching exact screenshot) */}
            <Box sx={{ position: "relative", pt: "3.5px" }} ref={txnDropdownRef}>
              <Box
                onClick={() => setTxnDropdownOpen((o) => !o)}
                sx={{
                  position: "relative",
                  cursor: "pointer",
                  border: "2px solid",
                  borderColor: isDark ? "#6366f1" : "#4f46e5",
                  borderRadius: "7px",
                  px: "12.25px",
                  pt: "10.5px",
                  pb: "8.75px",
                  bgcolor: isDark ? "#0f172a" : "#ffffff",
                  transition: "all 0.15s",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                  "&:hover": { borderColor: "#4338ca" },
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Floating Outlined Label in border notch */}
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    top: "-8.75px",
                    left: "8.75px",
                    bgcolor: isDark ? "#0f172a" : "#ffffff",
                    px: "5.25px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: isDark ? "#818cf8" : "#4f46e5",
                  }}
                >
                  Transaction Type
                </Box>

                {/* Selected Text */}
                <Box component="span" sx={{ fontSize: 12.25, fontWeight: 500, color: isDark ? "#f1f5f9" : "#0f172a" }}>
                  {activeTxnMeta.name}
                </Box>

                {/* Arrow Icon */}
                {txnDropdownOpen ? (
                  <ChevronUp size={17.5} strokeWidth={2.5} style={{ color: isDark ? "#818cf8" : "#4f46e5" }} />
                ) : (
                  <ChevronDown size={17.5} strokeWidth={2.5} style={{ color: isDark ? "#818cf8" : "#4f46e5" }} />
                )}
              </Box>

              {/* Dropdown Menu Popup */}
              {txnDropdownOpen && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    mt: "3.5px",
                    bgcolor: isDark ? "#0f172a" : "#ffffff",
                    border: "1px solid",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    borderRadius: "7px",
                    boxShadow: 12,
                    zIndex: 40,
                    overflow: "hidden",
                    py: "3.5px",
                  }}
                >
                  {TRANSACTION_TYPES.map((t) => {
                    const isSelected = settings.transactionType === t.id;
                    return (
                      <Box
                        key={t.id}
                        onClick={() => handleSelectTransactionType(t.id)}
                        sx={{
                          px: "14px",
                          py: "8.75px",
                          fontSize: 12.25,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          bgcolor: isSelected ? "#4338ca" : "transparent",
                          color: isSelected ? "#ffffff" : isDark ? "#e2e8f0" : "#1e293b",
                          fontWeight: isSelected ? 600 : 500,
                          "&:hover": { bgcolor: isSelected ? "#4338ca" : isDark ? "#1e293b" : "#f1f5f9" },
                        }}
                      >
                        <span>{t.name}</span>
                        {isSelected && <Check size={14} strokeWidth={2.5} color="#ffffff" />}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* 3. PDF Format Dropdown (All 7 Swayam formats: A4, A5, Thermal Print, Landscape A4, Landscape A5, Letter Head, A4 Half) */}
            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em", mb: "5.25px" }}>
                PDF Format
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
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
                sx={{ "& .MuiInputBase-input": { fontSize: 10.5, fontWeight: 500 } }}
              >
                {PDF_FORMAT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 4. Page Size & Format Buttons */}
            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em", mb: "5.25px" }}>
                Page Size
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" }}>
                {(settings.pdfFormat === "thermal" ? ["2inch", "3inch", "4inch"] : ["A4", "A5", "Letter"]).map((sz) => (
                  <Button
                    key={sz}
                    onClick={() => setSettings((prev) => ({ ...prev, pageSize: sz }))}
                    sx={{
                      py: "7px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: "7px",
                      border: "1px solid",
                      textTransform: "none",
                      ...(settings.pageSize === sz
                        ? { bgcolor: "#4f46e5", color: "#ffffff", borderColor: "#4f46e5", boxShadow: 1, "&:hover": { bgcolor: "#4f46e5" } }
                        : {
                            bgcolor: isDark ? "#1e293b" : "#f8fafc",
                            color: isDark ? "#cbd5e1" : "#334155",
                            borderColor: isDark ? "#334155" : "#cbd5e1",
                            "&:hover": { bgcolor: isDark ? "#334155" : "#f1f5f9" },
                          }),
                    }}
                  >
                    {settings.pdfFormat === "thermal"
                      ? sz === "2inch" ? "2 inch (58mm)" : sz === "3inch" ? "3 inch (80mm)" : "4 inch"
                      : sz}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* 5. Orientation Switch (PORTRAIT vs LANDSCAPE) */}
            {settings.pdfFormat !== "thermal" && (
              <Box>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: "5.25px" }}>
                  <Typography component="label" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Orientation
                  </Typography>
                  <Box component="span" sx={{ fontSize: 10, color: isDark ? "#818cf8" : "#4f46e5", fontWeight: 600 }}>
                    {settings.orientation === "landscape" ? "Wide Layout" : "Vertical Layout"}
                  </Box>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "7px" }}>
                  <Button
                    onClick={() => setSettings((prev) => ({ ...prev, orientation: "portrait" }))}
                    sx={{
                      py: "7px",
                      px: "10.5px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: "7px",
                      border: "1px solid",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      textTransform: "none",
                      ...(settings.orientation === "portrait"
                        ? { bgcolor: "#4f46e5", color: "#ffffff", borderColor: "#4f46e5", boxShadow: 1, outline: "2px solid rgba(99,102,241,0.2)", outlineOffset: "0px" }
                        : {
                            bgcolor: isDark ? "#1e293b" : "#f8fafc",
                            color: isDark ? "#cbd5e1" : "#334155",
                            borderColor: isDark ? "#334155" : "#cbd5e1",
                            "&:hover": { bgcolor: isDark ? "#334155" : "#f1f5f9" },
                          }),
                    }}
                  >
                    <Box sx={{ width: 12.25, height: 15.75, border: "1px solid currentColor", borderRadius: "1.75px" }} />
                    <span>Portrait</span>
                  </Button>

                  <Button
                    onClick={() => setSettings((prev) => ({ ...prev, orientation: "landscape" }))}
                    sx={{
                      py: "7px",
                      px: "10.5px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: "7px",
                      border: "1px solid",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      textTransform: "none",
                      ...(settings.orientation === "landscape"
                        ? { bgcolor: "#4f46e5", color: "#ffffff", borderColor: "#4f46e5", boxShadow: 1, outline: "2px solid rgba(99,102,241,0.2)", outlineOffset: "0px" }
                        : {
                            bgcolor: isDark ? "#1e293b" : "#f8fafc",
                            color: isDark ? "#cbd5e1" : "#334155",
                            borderColor: isDark ? "#334155" : "#cbd5e1",
                            "&:hover": { bgcolor: isDark ? "#334155" : "#f1f5f9" },
                          }),
                    }}
                  >
                    <Box sx={{ width: 15.75, height: 12.25, border: "1px solid currentColor", borderRadius: "1.75px" }} />
                    <span>Landscape</span>
                  </Button>
                </Box>
              </Box>
            )}

            {/* Divider */}
            <Box sx={{ borderTop: "1px solid", borderColor: isDark ? "#1e293b" : "#e2e8f0", my: "7px" }} />

            {/* 6. Navigation Buttons matching Swayam Bill Book screenshot */}
            <Box sx={{ "& > * + *": { mt: "10.5px" }, pt: "7px" }}>
              {[
                { id: "template", label: "Invoice Template" },
                { id: "customise", label: "Customize Format" },
                { id: "header", label: "Header Settings" },
                { id: "table", label: "Table Settings" },
                { id: "footer", label: "Footer Settings" },
              ].map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  onClick={() => setActiveDrawer(activeDrawer === item.id ? null : item.id)}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: "8.75px",
                    px: "10.5px",
                    borderRadius: "10.5px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    userSelect: "none",
                    bgcolor: activeDrawer === item.id ? (isDark ? "rgba(30,27,75,0.4)" : "#eef2ff") : "transparent",
                    boxShadow: activeDrawer === item.id ? "0 0 0 1px rgba(99,102,241,0.3)" : "none",
                    "&:hover": {
                      bgcolor: activeDrawer === item.id ? undefined : isDark ? "rgba(30,41,59,0.6)" : "#f8fafc",
                    },
                    "&:hover .nav-item-label": { color: isDark ? "#a5b4fc" : "#4338ca" },
                    "&:hover .nav-item-icon": { transform: "scale(1.1)" },
                  }}
                >
                  <Box
                    component="span"
                    className="nav-item-label"
                    sx={{ fontWeight: 700, fontSize: 15, transition: "color 0.15s", color: isDark ? "#818cf8" : "#4338ca" }}
                  >
                    {item.label}
                  </Box>
                  <Box
                    className="nav-item-icon"
                    sx={{
                      width: 24.5,
                      height: 24.5,
                      borderRadius: "9999px",
                      bgcolor: "#4f46e5",
                      "&:hover": { bgcolor: "#4338ca" },
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                      transition: "transform 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </Box>
                </Stack>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ========================================================================= */}
        {/* SLIDE-OUT DRAWER / MODAL PANELS */}
        {/* ========================================================================= */}
        {activeDrawer && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: { xs: 280, sm: 308 },
              width: 336,
              maxWidth: "calc(100vw - 360px)",
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              borderRight: "1px solid",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              boxShadow: 12,
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer Header */}
            <Stack
              direction="row"
              sx={{
                px: "14px",
                py: "10.5px",
                borderBottom: "1px solid",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: isDark ? "#172033" : "#f8fafc",
              }}
            >
              <Typography component="h2" sx={{ fontWeight: 700, fontSize: 12.25, color: isDark ? "#f1f5f9" : "#1e293b", textTransform: "capitalize" }}>
                {activeDrawer === "template"
                  ? "Select Invoice Template"
                  : activeDrawer === "customise"
                  ? "Customization & Styling"
                  : activeDrawer === "header"
                  ? "Header Settings"
                  : activeDrawer === "table"
                  ? "Table Columns"
                  : "Footer Settings"}
              </Typography>
              <IconButton
                onClick={() => setActiveDrawer(null)}
                size="small"
                sx={{
                  p: "3.5px",
                  color: "#94a3b8",
                  "&:hover": { color: isDark ? "#e2e8f0" : "#334155", bgcolor: isDark ? "#1e293b" : "#e2e8f0" },
                  borderRadius: "7px",
                }}
              >
                <X size={14} />
              </IconButton>
            </Stack>

            {/* Drawer Body */}
            <Box sx={{ p: "14px", flex: "1 1 0%", overflowY: "auto", "& > * + *": { mt: "14px" } }}>
              {/* DRAWER 1: TEMPLATE SELECTOR */}
              {activeDrawer === "template" && (
                <Box sx={{ "& > * + *": { mt: "10.5px" } }}>
                  <Typography sx={{ fontSize: 10.5, color: isDark ? "#94a3b8" : "#64748b" }}>
                    Choose an invoice layout tailored for standard Indian GST tax invoices or high-density retail vouchers:
                  </Typography>
                  {availableTemplates.map((tmpl) => {
                    const isSelected = settings.template === tmpl.id;
                    return (
                      <Box
                        key={tmpl.id}
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            template: tmpl.id,
                            orientation: tmpl.id === "landscape_dual" ? "landscape" : prev.orientation,
                          }));
                        }}
                        sx={{
                          p: "10.5px",
                          borderRadius: "10.5px",
                          border: "1px solid",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          position: "relative",
                          ...(isSelected
                            ? {
                                bgcolor: isDark ? "rgba(30,27,75,0.4)" : "rgba(238,242,255,0.7)",
                                borderColor: "#6366f1",
                                boxShadow: "0 0 0 2px rgba(99,102,241,0.2), 0 1px 2px 0 rgba(0,0,0,0.05)",
                              }
            : {
                                bgcolor: isDark ? "#1e293b" : "#ffffff",
                                borderColor: isDark ? "#334155" : "#e2e8f0",
                                "&:hover": { borderColor: "#a5b4fc" },
                                "&:hover .tmpl-select-label": { color: isDark ? "#818cf8" : "#4f46e5" },
                              }),
                        }}
                      >
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: "3.5px" }}>
                          <Box component="span" sx={{ fontWeight: 700, fontSize: 10.5, color: isDark ? "#ffffff" : "#0f172a" }}>
                            {tmpl.name}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              px: "7px",
                              py: "1.75px",
                              borderRadius: "9999px",
                              bgcolor: isDark ? tmpl.badgeColor.darkBg : tmpl.badgeColor.bg,
                              color: isDark ? tmpl.badgeColor.darkColor : tmpl.badgeColor.color,
                            }}
                          >
                            {tmpl.badge}
                          </Box>
                        </Stack>
                        <Typography sx={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b", lineHeight: 1.375 }}>
                          {tmpl.description}
                        </Typography>

                        <Stack
                          direction="row"
                          sx={{
                            mt: "7px",
                            justifyContent: "space-between",
                            alignItems: "center",
                            pt: "7px",
                            borderTop: "1px solid",
                            borderColor: isDark ? "rgba(51,65,85,0.6)" : "#f1f5f9",
                          }}
                        >
                          <Box component="span" sx={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>
                            {tmpl.id === "landscape_dual" ? "Wide Format" : "Portrait / Landscape"}
                          </Box>
                          {isSelected ? (
                            <Stack direction="row" sx={{ alignItems: "center", gap: "3.5px", fontSize: 10.5, fontWeight: 700, color: isDark ? "#818cf8" : "#4f46e5" }}>
                              <Check size={12.25} /> Selected
                            </Stack>
                          ) : (
                            <Box component="span" className="tmpl-select-label" sx={{ fontSize: 10.5, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", transition: "color 0.15s" }}>
                              Select &rarr;
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* DRAWER 2: CUSTOMIZE FORMAT */}
              {activeDrawer === "customise" && (
                <Box sx={{ "& > * + *": { mt: "14px" } }}>
                  {/* Accent Colour */}
                  <Box>
                    <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em", mb: "7px" }}>
                      Accent Colour
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: "8.75px", alignItems: "center" }}>
                      {ACCENT_COLOR_PALETTES.map((pal) => (
                        <Box
                          component="button"
                          type="button"
                          key={pal.hex}
                          onClick={() => setSettings((prev) => ({ ...prev, accentColor: pal.hex }))}
                          title={pal.name}
                          sx={{
                            width: 24.5,
                            height: 24.5,
                            borderRadius: "9999px",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            "&:hover": { transform: "scale(1.1)" },
                            ...(settings.accentColor === pal.hex
                              ? { boxShadow: "0 0 0 2px #ffffff, 0 0 0 4px #6366f1", transform: "scale(1.05)" }
                              : { opacity: 0.9, "&:hover": { opacity: 1, transform: "scale(1.1)" } }),
                          }}
                          style={{ backgroundColor: pal.hex }}
                        >
                          {settings.accentColor === pal.hex && (
                            <Check size={12.25} strokeWidth={3} color="#ffffff" />
                          )}
                        </Box>
                      ))}
                      <Stack direction="row" sx={{ alignItems: "center", gap: "5.25px", ml: "3.5px" }}>
                        <Box
                          component="input"
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => setSettings((prev) => ({ ...prev, accentColor: e.target.value }))}
                          sx={{ width: 24.5, height: 24.5, borderRadius: "3.5px", cursor: "pointer", border: "1px solid", borderColor: isDark ? "#475569" : "#cbd5e1" }}
                        />
                        <Typography component="span" sx={{ fontSize: 11, fontFamily: "monospace", color: isDark ? "#94a3b8" : "#64748b", textTransform: "uppercase" }}>
                          {settings.accentColor}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Watermark Section */}
                  <Box sx={{ borderTop: "1px solid", borderColor: isDark ? "#1e293b" : "#e2e8f0", pt: "10.5px" }}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: "7px" }}>
                      <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em" }}>
                        Show Watermark
                      </Box>
                      <Checkbox
                        checked={settings.watermark?.enabled || false}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            watermark: { ...prev.watermark, enabled: e.target.checked },
                          }))
                        }
                        size="small"
                        sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                      />
                    </Stack>

                    {settings.watermark?.enabled && (
                      <Box sx={{ "& > * + *": { mt: "8.75px" }, bgcolor: isDark ? "rgba(30,41,59,0.6)" : "#f8fafc", p: "10.5px", borderRadius: "7px", border: "1px solid", borderColor: isDark ? "#334155" : "#e2e8f0" }}>
                        <Box>
                          <Typography component="label" sx={{ display: "block", fontSize: 11, color: isDark ? "#cbd5e1" : "#475569", fontWeight: 500, mb: "3.5px" }}>
                            Watermark Text
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            value={settings.watermark?.text || ""}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                watermark: { ...prev.watermark, text: e.target.value },
                              }))
                            }
                            placeholder="e.g. VYNERIX ERP or FIRM NAME"
                            sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: "5.25px" } }}
                          />
                        </Box>

                        <Box>
                          <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 11, color: isDark ? "#cbd5e1" : "#475569", mb: "3.5px" }}>
                            <span>Opacity</span>
                            <span>{settings.watermark?.opacity || 12}%</span>
                          </Stack>
                          <Box
                            component="input"
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
                            sx={{ width: "100%" }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Margins */}
                  <Box sx={{ borderTop: "1px solid", borderColor: isDark ? "#1e293b" : "#e2e8f0", pt: "10.5px" }}>
                    <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em", mb: "7px" }}>
                      Print Margins (mm)
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "7px", fontSize: 10.5 }}>
                      <Box>
                        <Typography component="span" sx={{ fontSize: 11, color: "#64748b" }}>Top:</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={settings.margins?.top || 6}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              margins: { ...prev.margins, top: Number(e.target.value) },
                            }))
                          }
                          sx={{ mt: "3.5px", "& .MuiInputBase-input": { fontSize: 10.5, py: "3.5px" } }}
                        />
                      </Box>
                      <Box>
                        <Typography component="span" sx={{ fontSize: 11, color: "#64748b" }}>Bottom:</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={settings.margins?.bottom || 6}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              margins: { ...prev.margins, bottom: Number(e.target.value) },
                            }))
                          }
                          sx={{ mt: "3.5px", "& .MuiInputBase-input": { fontSize: 10.5, py: "3.5px" } }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* DRAWER 3: HEADER SETTINGS */}
              {activeDrawer === "header" && (
                <Box sx={{ "& > * + *": { mt: "10.5px" } }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em" }}>
                      Header Elements
                    </Box>
                  </Stack>

                  <Box sx={{ "& > * + *": { mt: "7px" }, bgcolor: isDark ? "rgba(30,41,59,0.6)" : "#f8fafc", p: "10.5px", borderRadius: "7px", border: "1px solid", borderColor: isDark ? "#334155" : "#e2e8f0" }}>
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
                      <Stack
                        component="label"
                        direction="row"
                        key={item.key}
                        sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: isDark ? "#cbd5e1" : "#334155", py: "3.5px", cursor: "pointer" }}
                      >
                        <span>{item.label}</span>
                        <Checkbox
                          checked={settings.header?.[item.key] !== false}
                          onChange={() => toggleHeaderField(item.key)}
                          size="small"
                          sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                        />
                      </Stack>
                    ))}
                  </Box>

                  <Box sx={{ borderTop: "1px solid", borderColor: isDark ? "#1e293b" : "#e2e8f0", pt: "7px" }}>
                    <Box component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em", mb: "7px" }}>
                      Transaction & Dispatch Details
                    </Box>
                    <Box sx={{ "& > * + *": { mt: "7px" }, bgcolor: isDark ? "rgba(30,41,59,0.6)" : "#f8fafc", p: "10.5px", borderRadius: "7px", border: "1px solid", borderColor: isDark ? "#334155" : "#e2e8f0" }}>
                      {[
                        { key: "showTransport", label: "Transport & LR Details" },
                        { key: "showPo", label: "Purchase Order (PO) Details" },
                        { key: "showEway", label: "E-Way Bill Details" },
                        { key: "showShipTo", label: "Ship To (Consignee) Address" },
                      ].map((item) => (
                        <Stack
                          component="label"
                          direction="row"
                          key={item.key}
                          sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: isDark ? "#cbd5e1" : "#334155", py: "3.5px", cursor: "pointer" }}
                        >
                          <span>{item.label}</span>
                          <Checkbox
                            checked={settings.header?.[item.key] !== false}
                            onChange={() => toggleHeaderField(item.key)}
                            size="small"
                            sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                          />
                        </Stack>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* DRAWER 4: TABLE SETTINGS */}
              {activeDrawer === "table" && (
                <Box sx={{ "& > * + *": { mt: "10.5px" } }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em" }}>
                      Item Table Columns
                    </Box>
                    <Stack direction="row" sx={{ gap: "7px", fontSize: 10.5 }}>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setAllColumns(true)}
                        sx={{ color: "#4f46e5", "&:hover": { textDecoration: "underline" }, fontWeight: 600, border: "none", bgcolor: "transparent", cursor: "pointer", p: 0 }}
                      >
                        Show all
                      </Box>
                      <span>|</span>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setAllColumns(false)}
                        sx={{ color: "#64748b", "&:hover": { textDecoration: "underline" }, border: "none", bgcolor: "transparent", cursor: "pointer", p: 0 }}
                      >
                        Hide all
                      </Box>
                    </Stack>
                  </Stack>

                  <Typography sx={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b" }}>
                    Enable or disable columns displayed on the printed invoice:
                  </Typography>

                  <Box sx={{ "& > * + *": { mt: "5.25px" } }}>
                    {settings.columns.map((col, idx) => (
                      <Stack
                        direction="row"
                        key={col.id}
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: "8.75px",
                          borderRadius: "7px",
                          border: "1px solid",
                          fontSize: 10.5,
                          transition: "all 0.15s",
                          ...(col.enabled
                            ? { bgcolor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#cbd5e1", color: isDark ? "#e2e8f0" : "#1e293b" }
                            : { bgcolor: isDark ? "#172033" : "#f8fafc", borderColor: isDark ? "#1e293b" : "#e2e8f0", color: "#94a3b8", textDecoration: "line-through", opacity: 0.7 }),
                        }}
                      >
                        <Stack direction="row" sx={{ alignItems: "center", gap: "7px" }}>
                          <Box
                            component="span"
                            sx={{
                              width: 17.5,
                              height: 17.5,
                              borderRadius: "3.5px",
                              bgcolor: isDark ? "#334155" : "#f1f5f9",
                              color: isDark ? "#94a3b8" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "monospace",
                              fontSize: 10,
                            }}
                          >
                            {idx + 1}
                          </Box>
                          <Box component="span" sx={{ fontWeight: 500 }}>{col.label}</Box>
                        </Stack>
                        <Checkbox
                          checked={col.enabled}
                          onChange={() => toggleColumn(col.id)}
                          size="small"
                          sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                        />
                      </Stack>
                    ))}
                  </Box>
                </Box>
              )}

              {/* DRAWER 5: FOOTER SETTINGS */}
              {activeDrawer === "footer" && (
                <Box sx={{ "& > * + *": { mt: "10.5px" } }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em" }}>
                      Footer Elements
                    </Box>
                  </Stack>

                  <Box sx={{ "& > * + *": { mt: "7px" }, bgcolor: isDark ? "rgba(30,41,59,0.6)" : "#f8fafc", p: "10.5px", borderRadius: "7px", border: "1px solid", borderColor: isDark ? "#334155" : "#e2e8f0" }}>
                    {[
                      { key: "showHsnSummary", label: "HSN / SAC Summary Table" },
                      { key: "showInWords", label: "Amount in Words" },
                      { key: "showBankDetails", label: "Bank Account Details & UPI" },
                      { key: "showSavings", label: "Savings Highlight ('You Saved ₹XX')" },
                      { key: "showOutstanding", label: "Customer Outstanding Balance" },
                      { key: "showSignatory", label: "Authorized Signatory Block" },
                      { key: "showCustomerSign", label: "Customer Signature Line" },
                    ].map((item) => (
                      <Stack
                        component="label"
                        direction="row"
                        key={item.key}
                        sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: isDark ? "#cbd5e1" : "#334155", py: "3.5px", cursor: "pointer" }}
                      >
                        <span>{item.label}</span>
                        <Checkbox
                          checked={settings.footer?.[item.key] !== false}
                          onChange={() => toggleFooterField(item.key)}
                          size="small"
                          sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                        />
                      </Stack>
                    ))}
                  </Box>

                  {/* Terms Textarea */}
                  <Box sx={{ borderTop: "1px solid", borderColor: isDark ? "#1e293b" : "#e2e8f0", pt: "10.5px" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: "3.5px" }}>
                      <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", textTransform: "uppercase", letterSpacing: "0.025em" }}>
                        Terms & Conditions
                      </Box>
                      <Checkbox
                        checked={settings.footer?.showTerms !== false}
                        onChange={() => toggleFooterField("showTerms")}
                        size="small"
                        sx={{ p: 0, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                      />
                    </Stack>
                    {settings.footer?.showTerms !== false && (
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={settings.footer?.termsText || ""}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            footer: { ...prev.footer, termsText: e.target.value },
                          }))
                        }
                        placeholder="Enter terms and conditions..."
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Drawer Bottom Bar (Swayam Bill Book style: Save, Back, and Reset to original) */}
            <Stack
              direction="row"
              sx={{
                p: "10.5px",
                borderTop: "1px solid",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "7px",
                bgcolor: isDark ? "#172033" : "#f8fafc",
              }}
            >
              <Stack direction="row" sx={{ alignItems: "center", gap: "7px" }}>
                <Button
                  onClick={() => {
                    handleSave();
                    setActiveDrawer(null);
                  }}
                  variant="contained"
                  sx={{
                    px: "17.5px",
                    py: "7px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    bgcolor: "#4f46e5",
                    "&:hover": { bgcolor: "#4338ca" },
                    borderRadius: "7px",
                    boxShadow: 1,
                    textTransform: "none",
                  }}
                >
                  Save
                </Button>
                <Button
                  onClick={() => setActiveDrawer(null)}
                  sx={{
                    px: "17.5px",
                    py: "7px",
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: isDark ? "#e2e8f0" : "#334155",
                    bgcolor: isDark ? "#334155" : "#e2e8f0",
                    "&:hover": { bgcolor: isDark ? "#475569" : "#cbd5e1" },
                    borderRadius: "7px",
                    textTransform: "none",
                  }}
                >
                  Back
                </Button>
              </Stack>

              {activeDrawer === "customise" && (
                <Box
                  component="button"
                  type="button"
                  onClick={handleReset}
                  sx={{
                    fontSize: 10.5,
                    color: "#64748b",
                    "&:hover": { color: isDark ? "#cbd5e1" : "#334155" },
                    textDecoration: "underline",
                    fontWeight: 500,
                    border: "none",
                    bgcolor: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Reset to original
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* CENTER / RIGHT REAL-TIME WYSIWYG PREVIEW CANVAS */}
        {/* ========================================================================= */}
        <Box
          sx={{
            flex: "1 1 0%",
            overflow: "auto",
            p: { xs: "14px", sm: "28px" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            bgcolor: isDark ? "rgba(2,6,23,0.8)" : "#e2e8f0",
          }}
        >
          {/* Format Canvas Banner */}
          <Stack
            direction="row"
            sx={{
              mb: "10.5px",
              px: "10.5px",
              py: "5.25px",
              borderRadius: "9999px",
              bgcolor: isDark ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.8)",
              backdropFilter: "blur(4px)",
              border: "1px solid",
              borderColor: isDark ? "#334155" : "#cbd5e1",
              fontSize: 10.5,
              fontWeight: 600,
              color: isDark ? "#cbd5e1" : "#475569",
              alignItems: "center",
              gap: "10.5px",
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}
          >
            <Stack direction="row" sx={{ alignItems: "center", gap: "3.5px", color: isDark ? "#818cf8" : "#4f46e5" }}>
              <Sparkles size={12.25} /> Live WYSIWYG Preview
            </Stack>
            <span>&bull;</span>
            <span>
              {settings.pageSize}{" "}
              {settings.orientation === "landscape" ? "Landscape (297 × 210 mm)" : "Portrait (210 × 297 mm)"}
            </span>
            <span>&bull;</span>
            <Box component="span" sx={{ textTransform: "capitalize" }}>{settings.template} Template</Box>
          </Stack>

          {/* Scaled Preview Wrapper */}
          <Box
            sx={{ transition: "transform 0.2s", transformOrigin: "top" }}
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
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
