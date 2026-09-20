import { useEffect, useMemo, useState } from "react";
import { Eye, RotateCcw, Save } from "lucide-react";
import QRCode from "qrcode";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  buildCode39SvgMarkup,
} from "../../utils/salesReceiptCustomization";
import api from "../../api/axios";
import useCompanyOptions from "../../utils/useCompanyOptions";
import {
  DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION,
  createDefaultWarehouseBarcodeCustomization,
  fetchWarehouseBarcodeCustomization,
  getWarehouseCodePosition,
  getWarehouseEffectiveFieldPosition,
  getWarehouseLabelFieldAlignClass,
  getWarehouseLabelFieldFontMm,
  getWarehouseLabelFieldJustifyClass,
  getWarehouseOrderedFields,
  getWarehouseLabelFieldPosition,
  getWarehouseStickerMetrics,
  isWarehouseLabelFieldVisible,
  loadWarehouseBarcodeCustomization,
  normalizeWarehouseBarcodeCustomization,
  resetWarehouseBarcodeCustomization,
  saveWarehouseBarcodeCustomization,
  splitWarehouseLabelFieldsForCenter,
  WAREHOUSE_BARCODE_FIELD_DEFINITIONS,
  WAREHOUSE_BARCODE_POSITION_OPTIONS,
  WAREHOUSE_FONT_FAMILY_OPTIONS,
  WAREHOUSE_FONT_SIZE_CONTROLS,
  WAREHOUSE_PRINT_MODE_OPTIONS,
  WAREHOUSE_LABEL_FORMAT_OPTIONS,
} from "../../utils/warehouseBarcodeCustomization";
import { Box, Stack, Typography, TextField, MenuItem, Button, Radio, Switch, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const settingsCardSx = { borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, p: 2.5 };
const settingsFieldLabelSx = { display: "block", mb: 0.5, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" };
const mmFieldSx = { "& .MuiInputBase-input": { fontSize: 12.25, py: 1.25 } };

const RadioCell = ({ name, checked, onChange }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Radio name={name} checked={checked} onChange={onChange} size="small" />
  </Box>
);

const WarehouseFieldTable = ({
  rows,
  onToggleVisible,
  onPositionChange,
  onPriorityChange,
}) => (
  <Box sx={{ borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, overflow: "hidden" }}>
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
      <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>Fields</Typography>
    </Box>
    <Box sx={{ overflowX: "auto" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: "#165da8", fontSize: 12.25, fontWeight: 600, color: "#fff" }}>Title</TableCell>
            <TableCell sx={{ bgcolor: "#165da8", fontSize: 12.25, fontWeight: 600, color: "#fff" }}>Position</TableCell>
            <TableCell sx={{ bgcolor: "#165da8", fontSize: 12.25, fontWeight: 600, color: "#fff", width: 112 }}>Priority</TableCell>
            <TableCell sx={{ bgcolor: "#165da8", fontSize: 12.25, fontWeight: 600, color: "#fff", width: 96, textAlign: "center" }}>Hide</TableCell>
            <TableCell sx={{ bgcolor: "#165da8", fontSize: 12.25, fontWeight: 600, color: "#fff", width: 96, textAlign: "center" }}>Show</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key} sx={{ bgcolor: index % 2 === 0 ? "action.hover" : "background.paper" }}>
              <TableCell sx={{ border: "1px solid", borderColor: "divider", fontSize: 12.25, color: "text.secondary" }}>{row.label}</TableCell>
              <TableCell sx={{ border: "1px solid", borderColor: "divider" }}>
                {row.hasPosition ? (
                  <TextField
                    select
                    value={row.position}
                    onChange={(event) => onPositionChange(row.key, event.target.value)}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                  >
                    {WAREHOUSE_BARCODE_POSITION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label.toLowerCase()}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Box sx={{ height: 40, borderRadius: "7px", bgcolor: "action.hover" }} />
                )}
              </TableCell>
              <TableCell sx={{ border: "1px solid", borderColor: "divider" }}>
                {row.hasPriority ? (
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    value={row.priority ?? ""}
                    onChange={(event) => onPriorityChange(row.key, event.target.value)}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                  />
                ) : (
                  <Box sx={{ height: 40, borderRadius: "7px", bgcolor: "action.hover" }} />
                )}
              </TableCell>
              <TableCell sx={{ border: "1px solid", borderColor: "divider" }}>
                <RadioCell
                  name={`warehouse-field-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </TableCell>
              <TableCell sx={{ border: "1px solid", borderColor: "divider" }}>
                <RadioCell
                  name={`warehouse-field-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  </Box>
);

const previewLabels = [
  {
    key: "sample-1",
    codeValue: "SM178",
    productName: "Fantasy Silk Saree",
    fields: [
      { key: "mrp", label: "MRP", value: "220.00" },
      { key: "discount", label: "Disc", value: "10%" },
      { key: "rs", label: "Rs", value: "198.00" },
    ],
    note: "(incl.. of all taxes)",
  },
  {
    key: "sample-2",
    codeValue: "SM179",
    productName: "Fantasy Silk Saree",
    fields: [
      { key: "mrp", label: "MRP", value: "220.00" },
      { key: "discount", label: "Disc", value: "10%" },
      { key: "rs", label: "Rs", value: "198.00" },
    ],
    note: "(incl.. of all taxes)",
  },
  {
    key: "sample-3",
    codeValue: "SM180",
    productName: "Fantasy Silk Saree",
    fields: [
      { key: "mrp", label: "MRP", value: "220.00" },
      { key: "discount", label: "Disc", value: "10%" },
      { key: "rs", label: "Rs", value: "198.00" },
    ],
    note: "(incl.. of all taxes)",
  },
];

const ToggleCard = ({ label, hint, checked, onChange }) => (
  <Stack
    component="label"
    direction="row"
    spacing={2}
    sx={{
      cursor: "pointer",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: "10.5px",
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "action.hover",
      px: 2,
      py: 1.5,
      transition: "all 0.15s",
      "&:hover": { borderColor: "primary.light", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06) },
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 10.5, lineHeight: 1.6, color: "text.secondary" }}>{hint}</Typography>
    </Box>
    <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} sx={{ mt: -0.5 }} />
  </Stack>
);

const StickerFieldsBlock = ({ fields, metrics, textStyle, settings }) => {
  if (fields.length === 0) return null;
  const codePosition = getWarehouseCodePosition(settings);

  return (
    <div
      style={{
        marginTop: `${metrics.fieldsMarginTopMm}mm`,
        display: "grid",
        rowGap: `${metrics.fieldRowGapMm}mm`,
      }}
    >
      {fields.map((field) => {
        const fieldPosition = getWarehouseEffectiveFieldPosition(
          getWarehouseLabelFieldPosition(settings, field.key),
          codePosition
        );
        const isMrp = field.key === "mrp";
        const isRs = field.key === "rs" || field.key === "price";
        const isStriked = isMrp && Boolean(settings.mrpStrikeOut);
        const fieldFontWeight = isRs
          ? (textStyle.fontWeight === 700 ? 800 : 700)
          : textStyle.fontWeight;

        if (isStriked) {
          return (
            <div
              key={field.key}
              className={`flex items-center text-gray-700 ${getWarehouseLabelFieldJustifyClass(fieldPosition)} ${getWarehouseLabelFieldAlignClass(fieldPosition)}`}
              style={{
                gap: `${metrics.bodyGapMm}mm`,
                fontSize: `${getWarehouseLabelFieldFontMm(metrics, field.key)}mm`,
                fontFamily: textStyle.fontFamily,
                fontWeight: fieldFontWeight,
                fontStyle: textStyle.fontStyle,
              }}
            >
              <span className="relative inline-flex items-center gap-[0.8mm]">
                <span className="truncate uppercase">{field.label}</span>
                <span className="truncate">{field.value}</span>
                <svg
                  className="pointer-events-none absolute -inset-x-1 inset-y-0 h-full w-[calc(100%+8px)] overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="12" x2="100" y2="88" stroke="#dc2626" strokeWidth="12" strokeLinecap="round" />
                  <line x1="0" y1="88" x2="100" y2="12" stroke="#dc2626" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          );
        }

        return (
          <div
            key={field.key}
            className={`flex items-center ${isRs ? "font-bold text-gray-950" : "text-gray-800"} ${getWarehouseLabelFieldJustifyClass(fieldPosition)} ${getWarehouseLabelFieldAlignClass(fieldPosition)}`}
            style={{
              gap: `${metrics.bodyGapMm}mm`,
              fontSize: `${getWarehouseLabelFieldFontMm(metrics, field.key)}mm`,
              fontFamily: textStyle.fontFamily,
              fontWeight: fieldFontWeight,
              fontStyle: textStyle.fontStyle,
              textDecoration: textStyle.textDecoration,
            }}
          >
            <span className="truncate uppercase">{field.label}</span>
            <span className="truncate">{field.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const StickerCard = ({ label, settings, storeName, qrSrc = "" }) => {
  const showStoreName = isWarehouseLabelFieldVisible(settings, "storeName") && storeName;
  const showProductName = isWarehouseLabelFieldVisible(settings, "productName");
  const showNote = isWarehouseLabelFieldVisible(settings, "note") && settings.note;
  const storeNamePosition = getWarehouseLabelFieldPosition(settings, "storeName");
  const productNamePosition = getWarehouseLabelFieldPosition(settings, "productName");
  const notePosition = getWarehouseLabelFieldPosition(settings, "note");
  const metrics = getWarehouseStickerMetrics(settings);
  const textStyle = metrics.textStyle;
  const codePosition = getWarehouseCodePosition(settings);
  const isCodeRight = codePosition === "right";
  const isCodeCentered = codePosition === "center";
  const visibleFields = (Array.isArray(label.fields) ? label.fields : []).filter((field) => {
    if (field.key === "mrp") return isWarehouseLabelFieldVisible(settings, "mrp");
    if (field.key === "discount") return isWarehouseLabelFieldVisible(settings, "discount");
    if (field.key === "rs") return isWarehouseLabelFieldVisible(settings, "rs");
    return true;
  });
  const orderedVisibleFields = getWarehouseOrderedFields(settings, visibleFields);
  const { leftFields, rightFields } = splitWarehouseLabelFieldsForCenter(settings, orderedVisibleFields);
  const barcodeMarkup = settings.codeType === "barcode"
    ? buildCode39SvgMarkup(label.codeValue, {
        height: 42,
        narrowWidth: 1.2,
        wideWidth: 3.2,
        quietZone: 8,
        showText: false,
      })
    : "";
  const codeContent = (
    <div className="flex flex-col items-center justify-center overflow-hidden">
      {settings.codeType === "code" ? (
        qrSrc ? (
          <img
            src={qrSrc}
            alt={label.codeValue}
            className="object-contain"
            style={{ width: `${metrics.qrSizeMm}mm`, height: `${metrics.qrSizeMm}mm` }}
          />
        ) : (
          <div
            style={{ width: `${metrics.qrSizeMm}mm`, height: `${metrics.qrSizeMm}mm`, borderRadius: "1mm", backgroundColor: "#f3f4f6", animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
          />
        )
      ) : (
        <div
          className="flex w-full items-center justify-center overflow-hidden"
          style={{ maxHeight: `${metrics.barcodeHeightMm}mm` }}
          dangerouslySetInnerHTML={{ __html: barcodeMarkup }}
        />
      )}
      <div
        className="max-w-full truncate text-center tracking-[0.02em] text-gray-700"
        style={{
          marginTop: `${metrics.codeTextMarginTopMm}mm`,
          fontSize: `${metrics.codeTextFontMm}mm`,
          fontFamily: textStyle.fontFamily,
          fontWeight: textStyle.fontWeight,
          fontStyle: textStyle.fontStyle,
          textDecoration: textStyle.textDecoration,
        }}
      >
        {label.codeValue}
      </div>
    </div>
  );
  const productNameContent = showProductName ? (
    <div
      className={`flex w-full items-center ${getWarehouseLabelFieldJustifyClass(productNamePosition)} ${getWarehouseLabelFieldAlignClass(productNamePosition)}`}
    >
      <div
        className="max-w-full truncate uppercase leading-tight text-gray-900"
        style={{
          fontSize: `${metrics.productNameFontMm}mm`,
          fontFamily: textStyle.fontFamily,
          fontWeight: textStyle.fontWeight,
          fontStyle: textStyle.fontStyle,
          textDecoration: textStyle.textDecoration,
        }}
      >
        {label.productName}
      </div>
    </div>
  ) : null;
  const noteContent = showNote ? (
    <div
      className={`flex w-full items-center ${getWarehouseLabelFieldJustifyClass(notePosition)} ${getWarehouseLabelFieldAlignClass(notePosition)}`}
      style={{ marginTop: `${metrics.noteMarginTopMm}mm` }}
    >
      <div
        className="max-w-full leading-tight text-gray-700"
        style={{
          fontSize: `${metrics.noteFontMm}mm`,
          fontFamily: textStyle.fontFamily,
          fontWeight: textStyle.fontWeight,
          fontStyle: textStyle.fontStyle,
          textDecoration: textStyle.textDecoration,
        }}
      >
        {settings.note}
      </div>
    </div>
  ) : null;
  const contentColumn = (
    <div className="min-w-0 overflow-hidden">
      {productNameContent}
      <StickerFieldsBlock
        fields={orderedVisibleFields}
        metrics={metrics}
        textStyle={textStyle}
        settings={settings}
      />
      {noteContent}
    </div>
  );

  return (
    <div
      className="overflow-hidden rounded-[3mm] border border-gray-300 bg-white shadow-sm"
      style={{ width: `${metrics.labelWidthMm}mm`, height: `${metrics.labelHeightMm}mm` }}
    >
      {metrics.topBandHeightMm > 0 ? (
        <div
          className={`flex items-center px-[1.5mm] ${getWarehouseLabelFieldJustifyClass(storeNamePosition)} ${getWarehouseLabelFieldAlignClass(storeNamePosition)}`}
          style={{
            minHeight: `${metrics.topBandHeightMm}mm`,
          }}
        >
          {showStoreName ? (
            <div
              className={`w-full truncate uppercase text-gray-900 ${getWarehouseLabelFieldAlignClass(storeNamePosition)}`}
              style={{
                fontSize: `${metrics.storeNameFontMm}mm`,
                letterSpacing: `${metrics.storeNameLetterSpacingEm}em`,
                fontFamily: textStyle.fontFamily,
                fontWeight: textStyle.fontWeight,
                fontStyle: textStyle.fontStyle,
                textDecoration: textStyle.textDecoration,
              }}
            >
              {storeName}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={isCodeCentered ? "flex flex-col" : "grid"}
        style={{
          ...(isCodeCentered
            ? {}
            : {
                gridTemplateColumns: isCodeRight
                  ? `minmax(0, 1fr) ${metrics.codeColumnWidthMm}mm`
                  : `${metrics.codeColumnWidthMm}mm minmax(0, 1fr)`,
              }),
          gap: `${metrics.bodyGapMm}mm`,
          padding: `${metrics.bodyPadYMm}mm ${metrics.bodyPadXMm}mm`,
          height: metrics.topBandHeightMm > 0
            ? `calc(${metrics.labelHeightMm}mm - ${metrics.topBandHeightMm}mm)`
            : `${metrics.labelHeightMm}mm`,
        }}
      >
        {isCodeCentered ? (
          <>
            {productNameContent}
            <div
              className="grid min-h-0 flex-1 items-center"
              style={{
                gridTemplateColumns: `minmax(0, 1fr) ${metrics.codeColumnWidthMm}mm minmax(0, 1fr)`,
                columnGap: `${metrics.bodyGapMm}mm`,
              }}
            >
              <div className="min-w-0 overflow-hidden">
                <StickerFieldsBlock
                  fields={leftFields}
                  metrics={metrics}
                  textStyle={textStyle}
                  settings={settings}
                />
              </div>
              {codeContent}
              <div className="min-w-0 overflow-hidden">
                <StickerFieldsBlock
                  fields={rightFields}
                  metrics={metrics}
                  textStyle={textStyle}
                  settings={settings}
                />
              </div>
            </div>
            {noteContent}
          </>
        ) : isCodeRight ? (
          <>
            {contentColumn}
            {codeContent}
          </>
        ) : (
          <>
            {codeContent}
            {contentColumn}
          </>
        )}
      </div>
    </div>
  );
};

export default function WarehouseCustomisation() {
  const authUser = useSelector((state) => state.auth.user);
  const companyOptions = useCompanyOptions() || [];
  const [companyId, setCompanyId] = useState(() => authUser?.company_id ? String(authUser.company_id) : "");
  const [settings, setSettings] = useState(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrSources, setQrSources] = useState({});

  useEffect(() => {
    if (!companyId && authUser?.company_id) {
      setCompanyId(String(authUser.company_id));
    }
  }, [authUser?.company_id, companyId]);

  const selectedStoreName = useMemo(() => {
    if (companyId && companyOptions.length > 0) {
      const match = companyOptions.find((opt) => String(opt.value) === String(companyId));
      if (match) return match.label;
    }
    return String(authUser?.company_name || "").trim() || "Store";
  }, [companyId, companyOptions, authUser?.company_name]);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      setLoading(true);
      const targetCompany = companyId || authUser?.company_id || "default";
      try {
        const config = await fetchWarehouseBarcodeCustomization(api, targetCompany);
        if (!cancelled) {
          setSettings(config);
          setSavedSettings(config);
        }
      } catch (err) {
        console.error("Error loading warehouse barcode customization:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [companyId, authUser?.company_id]);

  useEffect(() => {
    if (settings.codeType !== "code") {
      setQrSources({});
      return;
    }

    let cancelled = false;
    const buildQr = async () => {
      try {
        const entries = await Promise.all(
          previewLabels.map(async (label) => [
            label.key,
            await QRCode.toDataURL(label.codeValue, {
              margin: 1,
              width: 180,
              errorCorrectionLevel: "M",
            }),
          ])
        );
        if (!cancelled) setQrSources(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setQrSources({});
      }
    };

    buildQr();
    return () => {
      cancelled = true;
    };
  }, [settings.codeType]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings]
  );
  const metrics = useMemo(() => getWarehouseStickerMetrics(settings), [settings]);
  const labelFieldRows = useMemo(
    () =>
      WAREHOUSE_BARCODE_FIELD_DEFINITIONS.map((definition) => ({
        ...definition,
        ...(settings.labelFields?.[definition.key] || {}),
      })),
    [settings.labelFields]
  );

  const updateSetting = (patch) => {
    setSettings((prev) => normalizeWarehouseBarcodeCustomization({ ...prev, ...patch }));
  };

  const updateLabelField = (key, patch) => {
    setSettings((prev) =>
      normalizeWarehouseBarcodeCustomization({
        ...prev,
        labelFields: {
          ...prev.labelFields,
          [key]: {
            ...prev.labelFields?.[key],
            ...patch,
          },
        },
      })
    );
  };

  const handleReset = () => {
    const next = createDefaultWarehouseBarcodeCustomization();
    setSettings(next);
    toast.info("Draft reset to default. Click Save to persist.");
  };

  const handleSave = async () => {
    const next = normalizeWarehouseBarcodeCustomization(settings);
    const targetCompany = companyId || authUser?.company_id;
    setSaving(true);
    try {
      if (targetCompany) {
        await api.put("/warehouse-customisation", {
          companyId: targetCompany,
          ...next,
        });
      }
      saveWarehouseBarcodeCustomization(targetCompany || "default", next);
      setSettings(next);
      setSavedSettings(next);
      toast.success("Warehouse customisation saved");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err?.response?.data?.message || "Failed to save warehouse customisation on server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", px: 2, py: 2, color: "text.primary" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 460px" }, gap: 2 }}>
        <Stack spacing={2}>
          {/* Sticky so the whole header - title, description, and Save/Reset - stays reachable
              while scrolling through the settings below, instead of scrolling away with them. */}
          <Box sx={{ position: "sticky", top: 0, zIndex: 20, borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.background.paper, 0.95), px: 2.5, py: 2.5, boxShadow: 1, backdropFilter: "blur(8px)" }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>Warehouse Customisation</Typography>
                <Typography sx={{ mt: 0.5, maxWidth: 640, fontSize: 12.25, lineHeight: 1.6, color: "text.secondary" }}>
                  Control barcode sticker layout for warehouse label preview and print.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                {companyOptions && companyOptions.length > 1 && (
                  <TextField select value={companyId} onChange={(e) => setCompanyId(e.target.value)} size="small" sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}>
                    {companyOptions.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <Button
                  type="button"
                  onClick={handleReset}
                  variant="outlined"
                  color="inherit"
                  startIcon={<RotateCcw className="h-4 w-4" />}
                  sx={{ borderRadius: "7px", fontSize: 12.25, fontWeight: 500 }}
                >
                  Reset to default
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  startIcon={<Save className="h-4 w-4" />}
                  sx={{ borderRadius: "7px", fontSize: 12.25, fontWeight: 500, opacity: saving || loading ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, p: 2.5 }}>
            <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>Use Barcode Or Code</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
              <Box
                component="button"
                type="button"
                onClick={() => updateSetting({ codeType: "barcode" })}
                sx={(theme) => ({
                  borderRadius: "10.5px",
                  border: "1px solid",
                  borderColor: settings.codeType === "barcode" ? "primary.main" : "divider",
                  bgcolor: settings.codeType === "barcode" ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
                  color: settings.codeType === "barcode" ? "primary.main" : "text.secondary",
                  boxShadow: settings.codeType === "barcode" ? 1 : 0,
                  px: 2, py: 1.5, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  "&:hover": { borderColor: settings.codeType === "barcode" ? "primary.main" : "primary.light" },
                })}
              >
                <Typography sx={{ fontSize: 12.25, fontWeight: 600 }}>Barcode</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>Default sticker code style</Typography>
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => updateSetting({ codeType: "code" })}
                sx={(theme) => ({
                  borderRadius: "10.5px",
                  border: "1px solid",
                  borderColor: settings.codeType === "code" ? "primary.main" : "divider",
                  bgcolor: settings.codeType === "code" ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
                  color: settings.codeType === "code" ? "primary.main" : "text.secondary",
                  boxShadow: settings.codeType === "code" ? 1 : 0,
                  px: 2, py: 1.5, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  "&:hover": { borderColor: settings.codeType === "code" ? "primary.main" : "primary.light" },
                })}
              >
                <Typography sx={{ fontSize: 12.25, fontWeight: 600 }}>Code</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>QR-style sticker code</Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2, maxWidth: 320 }}>
              <Typography component="label" htmlFor="warehouse-code-position" sx={{ display: "block", mb: 0.5, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                Barcode / QR position
              </Typography>
              <TextField
                select
                id="warehouse-code-position"
                value={settings.codePosition || "left"}
                onChange={(event) => updateSetting({ codePosition: event.target.value })}
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1.25 } }}
              >
                {WAREHOUSE_BARCODE_POSITION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Printing Mode (Direct / Silent vs Browser Default)</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 640, fontSize: 12.25, lineHeight: 1.6, color: "text.secondary" }}>
              Choose whether barcode stickers print directly to your thermal printer in the background (no popup) or open the browser print preview dialog.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
              {WAREHOUSE_PRINT_MODE_OPTIONS.map((option) => (
                <Stack
                  key={option.value}
                  component="label"
                  sx={(theme) => ({
                    cursor: "pointer",
                    justifyContent: "space-between",
                    borderRadius: "10.5px",
                    border: "1px solid",
                    borderColor: settings.printMode === option.value ? "primary.main" : "divider",
                    bgcolor: settings.printMode === option.value ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06) : "background.paper",
                    boxShadow: settings.printMode === option.value ? 1 : 0,
                    p: 2,
                    transition: "all 0.15s",
                    "&:hover": { borderColor: settings.printMode === option.value ? "primary.main" : "text.disabled" },
                  })}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Radio
                      name="warehouse-print-mode"
                      value={option.value}
                      checked={settings.printMode === option.value}
                      onChange={() => updateSetting({ printMode: option.value })}
                      size="small"
                    />
                    <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>
                      {option.label}
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 1, fontSize: 10.5, lineHeight: 1.6, color: "text.secondary" }}>
                    {option.description}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Barcode and QR Code Format</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 640, fontSize: 12.25, lineHeight: 1.6, color: "text.secondary" }}>
              Choose the overall look of the printed receipt -- border and divider style, spacing, and how the header and total are emphasised. Applies to the preview on the right and every Barcode print.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(5, 1fr)" }, gap: 1.5 }}>
              {WAREHOUSE_LABEL_FORMAT_OPTIONS.map((option) => (
                <Stack
                  key={option.value}
                  component="label"
                  spacing={0.5}
                  sx={{
                    cursor: "pointer",
                    borderRadius: "7px",
                    border: "1px solid",
                    borderColor: settings.labelFormat === option.value ? "primary.main" : "divider",
                    bgcolor: settings.labelFormat === option.value ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
                    color: settings.labelFormat === option.value ? "primary.main" : "text.secondary",
                    px: 2, py: 1.5, fontSize: 12.25,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontWeight: 500 }}>
                    <Radio
                      name="warehouse-label-format"
                      value={option.value}
                      checked={settings.labelFormat === option.value}
                      onChange={() => updateSetting({ labelFormat: option.value })}
                      size="small"
                      sx={{ p: 0 }}
                    />
                    <Box component="span">{option.label}</Box>
                  </Stack>
                  <Typography sx={{ fontSize: 10.5, lineHeight: 1.6, color: "text.secondary" }}>{option.description}</Typography>
                </Stack>
              ))}
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Code Size In Mm</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
              <Box>
                <Typography component="label" htmlFor="warehouse-barcode-size" sx={settingsFieldLabelSx}>
                  Barcode size
                </Typography>
                <TextField
                  id="warehouse-barcode-size"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={settings.barcodeSizeMm}
                  onChange={(event) => updateSetting({ barcodeSizeMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-qr-code-size" sx={settingsFieldLabelSx}>
                  QR code size
                </Typography>
                <TextField
                  id="warehouse-qr-code-size"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={settings.qrCodeSizeMm}
                  onChange={(event) => updateSetting({ qrCodeSizeMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Sticker Size In Mm</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
              <Box>
                <Typography component="label" htmlFor="warehouse-label-width" sx={settingsFieldLabelSx}>
                  Width
                </Typography>
                <TextField
                  id="warehouse-label-width"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={settings.labelWidthMm}
                  onChange={(event) => updateSetting({ labelWidthMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-label-height" sx={settingsFieldLabelSx}>
                  Height
                </Typography>
                <TextField
                  id="warehouse-label-height"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={settings.labelHeightMm}
                  onChange={(event) => updateSetting({ labelHeightMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-label-top-band" sx={settingsFieldLabelSx}>
                  Top Space
                </Typography>
                <TextField
                  id="warehouse-label-top-band"
                  type="number"
                  slotProps={{ htmlInput: { min: "0", max: "30", step: "0.1" } }}
                  value={settings.topBandHeightMm}
                  onChange={(event) => updateSetting({ topBandHeightMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-labels-per-row" sx={settingsFieldLabelSx}>
                  Stickers Per Row
                </Typography>
                <TextField
                  select
                  id="warehouse-labels-per-row"
                  value={settings.labelsPerRow}
                  onChange={(event) => updateSetting({ labelsPerRow: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                >
                  <MenuItem value="1">1 per row</MenuItem>
                  <MenuItem value="2">2 per row</MenuItem>
                  <MenuItem value="3">3 per row</MenuItem>
                </TextField>
              </Box>
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Print Position (mm)</Typography>
            <Typography sx={{ fontSize: 10.5, color: "text.secondary", mb: 1.5 }}>
              Shifts where content lands on the physical label without changing its layout - use this to
              compensate for your printer's own print-head/gap-sensor offset. Negative values shift up/left.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
              <Box>
                <Typography component="label" htmlFor="warehouse-margin-top" sx={settingsFieldLabelSx}>
                  Margin Top
                </Typography>
                <TextField
                  id="warehouse-margin-top"
                  type="number"
                  slotProps={{ htmlInput: { min: "-10", max: "10", step: "0.1" } }}
                  value={settings.printMarginTopMm}
                  onChange={(event) => updateSetting({ printMarginTopMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-margin-bottom" sx={settingsFieldLabelSx}>
                  Margin Bottom
                </Typography>
                <TextField
                  id="warehouse-margin-bottom"
                  type="number"
                  slotProps={{ htmlInput: { min: "-10", max: "10", step: "0.1" } }}
                  value={settings.printMarginBottomMm}
                  onChange={(event) => updateSetting({ printMarginBottomMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-margin-left" sx={settingsFieldLabelSx}>
                  Margin Left
                </Typography>
                <TextField
                  id="warehouse-margin-left"
                  type="number"
                  slotProps={{ htmlInput: { min: "-10", max: "10", step: "0.1" } }}
                  value={settings.printMarginLeftMm}
                  onChange={(event) => updateSetting({ printMarginLeftMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="warehouse-margin-right" sx={settingsFieldLabelSx}>
                  Margin Right
                </Typography>
                <TextField
                  id="warehouse-margin-right"
                  type="number"
                  slotProps={{ htmlInput: { min: "-10", max: "10", step: "0.1" } }}
                  value={settings.printMarginRightMm}
                  onChange={(event) => updateSetting({ printMarginRightMm: event.target.value })}
                  fullWidth
                  sx={mmFieldSx}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={settingsCardSx}>
            <Typography component="label" sx={settingsFieldLabelSx}>Font</Typography>
            <Box sx={{ display: "grid", columnGap: 1.5, rowGap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
              {WAREHOUSE_FONT_SIZE_CONTROLS.map((control) => (
                <Box key={control.key} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Box sx={{ display: "flex", minHeight: 40, alignItems: "flex-end" }}>
                    <Typography component="label" htmlFor={`warehouse-${control.key}`} sx={{ ...settingsFieldLabelSx, mb: 0 }}>
                      {control.label}
                    </Typography>
                  </Box>
                  <TextField
                    id={`warehouse-${control.key}`}
                    type="number"
                    value={settings[control.key]}
                    onChange={(event) => updateSetting({ [control.key]: event.target.value })}
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1.5 } }}
                  />
                </Box>
              ))}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", minHeight: 40, alignItems: "flex-end" }}>
                  <Typography component="label" htmlFor="warehouse-font-family" sx={{ ...settingsFieldLabelSx, mb: 0 }}>
                    Font Style
                  </Typography>
                </Box>
                <TextField
                  select
                  id="warehouse-font-family"
                  value={settings.fontFamily}
                  onChange={(event) => updateSetting({ fontFamily: event.target.value })}
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1.5, fontFamily: metrics.textStyle.fontFamily } }}
                >
                  {WAREHOUSE_FONT_FAMILY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <ToggleCard
                label="Bold"
                hint="Apply bold styling to sticker text."
                checked={settings.fontBold}
                onChange={(checked) => updateSetting({ fontBold: checked })}
              />
              <ToggleCard
                label="Italic"
                hint="Apply italic styling to sticker text."
                checked={settings.fontItalic}
                onChange={(checked) => updateSetting({ fontItalic: checked })}
              />
              <ToggleCard
                label="Underlined"
                hint="Underline sticker text."
                checked={settings.fontUnderline}
                onChange={(checked) => updateSetting({ fontUnderline: checked })}
              />
              <ToggleCard
                label="MRP Strikethrough"
                hint="Strike out MRP (line-through) on barcode sticker to emphasize discounted price."
                checked={settings.mrpStrikeOut}
                onChange={(checked) => updateSetting({ mrpStrikeOut: checked })}
              />
            </Stack>
          </Box>

          <WarehouseFieldTable
            rows={labelFieldRows}
            onToggleVisible={(key, visible) => updateLabelField(key, { visible })}
            onPositionChange={(key, position) => updateLabelField(key, { position })}
            onPriorityChange={(key, priority) => updateLabelField(key, { priority })}
          />

          <Box sx={settingsCardSx}>
            <Typography component="label" htmlFor="warehouse-barcode-note" sx={settingsFieldLabelSx}>
              Note
            </Typography>
            <TextField
              id="warehouse-barcode-note"
              value={settings.note}
              onChange={(event) => updateSetting({ note: event.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="No note"
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, lineHeight: 1.6 } }}
            />
          </Box>

          {hasUnsavedChanges ? (
            <Box sx={(theme) => ({ borderRadius: "10.5px", border: "1px solid", borderColor: alpha(theme.palette.warning.main, 0.4), bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.1), px: 2, py: 1.5, fontSize: 12.25, color: "warning.main" })}>
              You have unsaved changes in warehouse customisation.
            </Box>
          ) : null}
        </Stack>

        <Box sx={{ position: { xl: "sticky" }, top: { xl: 16 }, alignSelf: { xl: "flex-start" } }}>
          <Box sx={{ borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, overflow: "hidden" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Sticker Preview</Typography>
                  <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                    {settings.labelWidthMm}mm x {settings.labelHeightMm}mm label preview
                  </Typography>
                </Box>
                <Eye className="h-4 w-4" style={{ color: "#9ca3af" }} />
              </Stack>
            </Box>

            <Stack spacing={1.5} sx={{ bgcolor: "#eef2f7", p: 2 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Single sticker</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ width: "fit-content", bgcolor: "#fff" }}>
                  <StickerCard
                    label={previewLabels[0]}
                    settings={settings}
                    storeName={selectedStoreName}
                    qrSrc={qrSources[previewLabels[0].key] || ""}
                  />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Sheet preview</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Box
                  sx={{
                    display: "grid",
                    bgcolor: "#fff",
                    width: `${metrics.labelWidthMm * metrics.labelsPerRow}mm`,
                    gridTemplateColumns: `repeat(${metrics.labelsPerRow}, ${metrics.labelWidthMm}mm)`,
                    columnGap: "0mm",
                    rowGap: "1mm",
                  }}
                >
                  {previewLabels.map((label) => (
                    <StickerCard
                      key={label.key}
                      label={label}
                      settings={settings}
                      storeName={selectedStoreName}
                      qrSrc={qrSources[label.key] || ""}
                    />
                  ))}
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
