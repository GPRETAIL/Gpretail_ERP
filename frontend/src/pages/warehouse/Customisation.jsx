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
} from "../../utils/warehouseBarcodeCustomization";

const fieldLabelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const fontControlFieldClass = "flex flex-col gap-1";
const fontControlLabelSlotClass = "flex min-h-10 items-end";
const fontControlLabelClass =
  "block w-full text-xs font-bold uppercase leading-tight tracking-wide text-gray-500 dark:text-gray-400";
const fontControlInputClass =
  "h-12 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const baseCardClass = "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm";
const TABLE_HEAD_CLASS = "bg-[#165da8] px-3 py-3 text-left text-sm font-semibold text-white";
const TABLE_CELL_CLASS = "border border-gray-200 dark:border-gray-700 px-3 py-3 align-middle text-sm text-slate-700 dark:text-slate-300";
const TABLE_INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const RadioCell = ({ name, checked, onChange }) => (
  <label className="flex items-center justify-center">
    <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4" />
  </label>
);

const WarehouseFieldTable = ({
  rows,
  onToggleVisible,
  onPositionChange,
  onPriorityChange,
}) => (
  <div className={`${baseCardClass} overflow-hidden`}>
    <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
      <div className="text-xl font-semibold text-slate-800 dark:text-slate-100">Fields</div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={TABLE_HEAD_CLASS}>Title</th>
            <th className={TABLE_HEAD_CLASS}>Position</th>
            <th className={`${TABLE_HEAD_CLASS} w-28`}>Priority</th>
            <th className={`${TABLE_HEAD_CLASS} w-24 text-center`}>Hide</th>
            <th className={`${TABLE_HEAD_CLASS} w-24 text-center`}>Show</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className={index % 2 === 0 ? "bg-gray-50/80 dark:bg-gray-700/40" : "bg-white dark:bg-gray-800"}>
              <td className={TABLE_CELL_CLASS}>{row.label}</td>
              <td className={TABLE_CELL_CLASS}>
                {row.hasPosition ? (
                  <select
                    value={row.position}
                    onChange={(event) => onPositionChange(row.key, event.target.value)}
                    className={TABLE_INPUT_CLASS}
                  >
                    {WAREHOUSE_BARCODE_POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label.toLowerCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700" />
                )}
              </td>
              <td className={TABLE_CELL_CLASS}>
                {row.hasPriority ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.priority ?? ""}
                    onChange={(event) => onPriorityChange(row.key, event.target.value)}
                    className={TABLE_INPUT_CLASS}
                  />
                ) : (
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700" />
                )}
              </td>
              <td className={TABLE_CELL_CLASS}>
                <RadioCell
                  name={`warehouse-field-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </td>
              <td className={TABLE_CELL_CLASS}>
                <RadioCell
                  name={`warehouse-field-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
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
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-blue-900/20">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
      <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{hint}</div>
    </div>
    <div className="pt-0.5">
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </div>
  </label>
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
        return (
          <div
            key={field.key}
            className={`flex items-center text-gray-800 ${getWarehouseLabelFieldJustifyClass(fieldPosition)} ${getWarehouseLabelFieldAlignClass(fieldPosition)}`}
            style={{
              gap: `${metrics.bodyGapMm}mm`,
              fontSize: `${getWarehouseLabelFieldFontMm(metrics, field.key)}mm`,
              fontFamily: textStyle.fontFamily,
              fontWeight: textStyle.fontWeight,
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
            className="animate-pulse rounded-[1mm] bg-gray-100"
            style={{ width: `${metrics.qrSizeMm}mm`, height: `${metrics.qrSizeMm}mm` }}
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
    <div className="min-h-full bg-gray-100 dark:bg-gray-900 px-4 py-4 text-gray-800 dark:text-gray-100">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-4">
          <div className={`${baseCardClass} px-5 py-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">Warehouse Customisation</div>
                <div className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Control barcode sticker layout for warehouse label preview and print.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {companyOptions && companyOptions.length > 1 && (
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
                  >
                    {companyOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Use Barcode Or Code</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateSetting({ codeType: "barcode" })}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  settings.codeType === "barcode"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
                }`}
              >
                <div className="text-sm font-semibold">Barcode</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Default sticker code style</div>
              </button>
              <button
                type="button"
                onClick={() => updateSetting({ codeType: "code" })}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  settings.codeType === "code"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
                }`}
              >
                <div className="text-sm font-semibold">Code</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">QR-style sticker code</div>
              </button>
            </div>
            <div className="mt-4 max-w-xs">
              <label htmlFor="warehouse-code-position" className={fieldLabelClass}>
                Barcode / QR position
              </label>
              <select
                id="warehouse-code-position"
                value={settings.codePosition || "left"}
                onChange={(event) => updateSetting({ codePosition: event.target.value })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {WAREHOUSE_BARCODE_POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Code Size In Mm</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="warehouse-barcode-size" className={fieldLabelClass}>
                  Barcode size
                </label>
                <input
                  id="warehouse-barcode-size"
                  type="number"
                  step="0.1"
                  value={settings.barcodeSizeMm}
                  onChange={(event) => updateSetting({ barcodeSizeMm: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="warehouse-qr-code-size" className={fieldLabelClass}>
                  QR code size
                </label>
                <input
                  id="warehouse-qr-code-size"
                  type="number"
                  step="0.1"
                  value={settings.qrCodeSizeMm}
                  onChange={(event) => updateSetting({ qrCodeSizeMm: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Sticker Size In Mm</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="warehouse-label-width" className={fieldLabelClass}>
                  Width
                </label>
                <input
                  id="warehouse-label-width"
                  type="number"
                  step="0.1"
                  value={settings.labelWidthMm}
                  onChange={(event) => updateSetting({ labelWidthMm: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="warehouse-label-height" className={fieldLabelClass}>
                  Height
                </label>
                <input
                  id="warehouse-label-height"
                  type="number"
                  step="0.1"
                  value={settings.labelHeightMm}
                  onChange={(event) => updateSetting({ labelHeightMm: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="warehouse-label-top-band" className={fieldLabelClass}>
                  Top Space
                </label>
                <input
                  id="warehouse-label-top-band"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={settings.topBandHeightMm}
                  onChange={(event) => updateSetting({ topBandHeightMm: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="warehouse-labels-per-row" className={fieldLabelClass}>
                  Stickers Per Row
                </label>
                <select
                  id="warehouse-labels-per-row"
                  value={settings.labelsPerRow}
                  onChange={(event) => updateSetting({ labelsPerRow: event.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="1">1 per row</option>
                  <option value="2">2 per row</option>
                  <option value="3">3 per row</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Font</label>
            <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              {WAREHOUSE_FONT_SIZE_CONTROLS.map((control) => (
                <div key={control.key} className={fontControlFieldClass}>
                  <div className={fontControlLabelSlotClass}>
                    <label htmlFor={`warehouse-${control.key}`} className={fontControlLabelClass}>
                      {control.label}
                    </label>
                  </div>
                  <input
                    id={`warehouse-${control.key}`}
                    type="number"
                    value={settings[control.key]}
                    onChange={(event) => updateSetting({ [control.key]: event.target.value })}
                    className={fontControlInputClass}
                  />
                </div>
              ))}
              <div className={fontControlFieldClass}>
                <div className={fontControlLabelSlotClass}>
                  <label htmlFor="warehouse-font-family" className={fontControlLabelClass}>
                    Font Style
                  </label>
                </div>
                <select
                  id="warehouse-font-family"
                  value={settings.fontFamily}
                  onChange={(event) => updateSetting({ fontFamily: event.target.value })}
                  className={fontControlInputClass}
                  style={{ fontFamily: metrics.textStyle.fontFamily }}
                >
                  {WAREHOUSE_FONT_FAMILY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 space-y-3">
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
            </div>
          </div>

          <WarehouseFieldTable
            rows={labelFieldRows}
            onToggleVisible={(key, visible) => updateLabelField(key, { visible })}
            onPositionChange={(key, position) => updateLabelField(key, { position })}
            onPriorityChange={(key, priority) => updateLabelField(key, { priority })}
          />

          <div className={`${baseCardClass} p-5`}>
            <label htmlFor="warehouse-barcode-note" className={fieldLabelClass}>
              Note
            </label>
            <textarea
              id="warehouse-barcode-note"
              value={settings.note}
              onChange={(event) => updateSetting({ note: event.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm leading-6 text-gray-800 dark:text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="No note"
            />
          </div>

          {hasUnsavedChanges ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              You have unsaved changes in warehouse customisation.
            </div>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className={`${baseCardClass} overflow-hidden`}>
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sticker Preview</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {settings.labelWidthMm}mm x {settings.labelHeightMm}mm label preview
                  </div>
                </div>
                <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="space-y-3 bg-[#eef2f7] dark:bg-gray-900/40 p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Single sticker</div>
              <div className="overflow-x-auto">
                <div className="w-fit bg-white">
                  <StickerCard
                    label={previewLabels[0]}
                    settings={settings}
                    storeName={selectedStoreName}
                    qrSrc={qrSources[previewLabels[0].key] || ""}
                  />
                </div>
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Sheet preview</div>
              <div className="overflow-x-auto">
                <div
                  className="grid bg-white"
                  style={{
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
