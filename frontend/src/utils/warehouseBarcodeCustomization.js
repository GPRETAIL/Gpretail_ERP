const STORAGE_KEY = "warehouse.barcode.customisation";
const DEFAULT_LABEL_WIDTH_MM = 50;
const DEFAULT_LABEL_HEIGHT_MM = 25;

export const WAREHOUSE_FONT_FAMILY_OPTIONS = [
  { value: "arial", label: "Arial" },
  { value: "calibri", label: "Calibri" },
  { value: "cambria", label: "Cambria" },
  { value: "comic-sans-ms", label: "Comic Sans MS" },
  { value: "courier-new", label: "Courier New" },
  { value: "georgia", label: "Georgia" },
  { value: "impact", label: "Impact" },
  { value: "tahoma", label: "Tahoma" },
  { value: "times-new-roman", label: "Times New Roman" },
  { value: "trebuchet-ms", label: "Trebuchet MS" },
  { value: "verdana", label: "Verdana" },
];

export const WAREHOUSE_BARCODE_POSITION_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

export const WAREHOUSE_BARCODE_FIELD_DEFINITIONS = [
  {
    key: "storeName",
    label: "Store name (Heading)",
    hasPosition: true,
    defaultPosition: "center",
    defaultVisible: false,
  },
  {
    key: "productName",
    label: "Product Name",
    hasPosition: true,
    defaultPosition: "left",
    defaultVisible: true,
  },
  {
    key: "mrp",
    label: "MRP",
    hasPosition: true,
    hasPriority: true,
    defaultPriority: 1,
    defaultPosition: "left",
    defaultVisible: true,
  },
  {
    key: "discount",
    label: "Discount",
    hasPosition: true,
    hasPriority: true,
    defaultPriority: 2,
    defaultPosition: "left",
    defaultVisible: true,
  },
  {
    key: "rs",
    label: "Rs",
    hasPosition: true,
    hasPriority: true,
    defaultPriority: 3,
    defaultPosition: "left",
    defaultVisible: true,
  },
  {
    key: "note",
    label: "Note",
    hasPosition: true,
    defaultPosition: "left",
    defaultVisible: false,
  },
];

const WAREHOUSE_FONT_FAMILY_STACKS = {
  arial: "Arial, Helvetica, sans-serif",
  calibri: "Calibri, 'Segoe UI', sans-serif",
  cambria: "Cambria, Georgia, serif",
  "comic-sans-ms": "'Comic Sans MS', 'Comic Sans', cursive",
  "courier-new": "'Courier New', Courier, monospace",
  georgia: "Georgia, 'Times New Roman', serif",
  impact: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  tahoma: "Tahoma, Geneva, sans-serif",
  "times-new-roman": "'Times New Roman', Times, serif",
  "trebuchet-ms": "'Trebuchet MS', Helvetica, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
};

const buildFieldDefaults = (definitions) =>
  definitions.reduce((acc, definition) => {
    acc[definition.key] = {
      visible: Boolean(definition.defaultVisible),
      ...(definition.hasPosition ? { position: definition.defaultPosition || "left" } : {}),
      ...(definition.hasPriority ? { priority: Number(definition.defaultPriority) || 1 } : {}),
    };
    return acc;
  }, {});

export const DEFAULT_WAREHOUSE_BARCODE_LABEL_FIELDS = buildFieldDefaults(
  WAREHOUSE_BARCODE_FIELD_DEFINITIONS
);

export const DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION = {
  codeType: "barcode",
  codePosition: "left",
  note: "",
  labelWidthMm: DEFAULT_LABEL_WIDTH_MM,
  labelHeightMm: DEFAULT_LABEL_HEIGHT_MM,
  topBandHeightMm: 4,
  labelsPerRow: 2,
  storeNameFontSizePx: 11,
  productNameFontSizePx: 10,
  mrpFontSizePx: 10,
  discountFontSizePx: 10,
  priceFontSizePx: 10,
  noteFontSizePx: 10,
  barcodeNumberFontSizePx: 10,
  barcodeSizeMm: 13.5,
  qrCodeSizeMm: 13.5,
  fontFamily: "arial",
  fontBold: false,
  fontItalic: false,
  fontUnderline: false,
  labelFields: DEFAULT_WAREHOUSE_BARCODE_LABEL_FIELDS,
};

const normalizeDimension = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0) return fallback;
  return Math.round(parsed * 100) / 100;
};

const normalizeFontFamily = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return WAREHOUSE_FONT_FAMILY_OPTIONS.some((option) => option.value === raw)
    ? raw
    : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.fontFamily;
};

export const WAREHOUSE_FONT_SIZE_CONTROLS = [
  { key: "storeNameFontSizePx", label: "Store name font size" },
  { key: "productNameFontSizePx", label: "Product name font size" },
  { key: "mrpFontSizePx", label: "MRP font size" },
  { key: "discountFontSizePx", label: "Disc font size" },
  { key: "priceFontSizePx", label: "Price font size" },
  { key: "noteFontSizePx", label: "Note font size" },
  { key: "barcodeNumberFontSizePx", label: "Barcode number font size" },
];

const DEFAULT_STORE_NAME_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.storeNameFontSizePx;
const DEFAULT_PRODUCT_NAME_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.productNameFontSizePx;
const DEFAULT_MRP_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.mrpFontSizePx;
const DEFAULT_DISCOUNT_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.discountFontSizePx;
const DEFAULT_PRICE_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.priceFontSizePx;
const DEFAULT_NOTE_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.noteFontSizePx;
const DEFAULT_BARCODE_NUMBER_FONT_PX = DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.barcodeNumberFontSizePx;

const normalizeFontSizePx = (value, fallback) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizeLegacyFontSizeScale = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(25, Math.min(300, Math.round(parsed)));
};

const fontSizePxFromLegacyScale = (scale, basePx) =>
  normalizeFontSizePx(Math.round((normalizeLegacyFontSizeScale(scale) / 100) * basePx), basePx);

const normalizeStoreNameFontSizePx = (value = {}, legacyScale) => {
  if (value.storeNameFontSizePx !== undefined) {
    return normalizeFontSizePx(value.storeNameFontSizePx, DEFAULT_STORE_NAME_FONT_PX);
  }
  if (value.headingFontSizePx !== undefined) {
    return normalizeFontSizePx(value.headingFontSizePx, DEFAULT_STORE_NAME_FONT_PX);
  }
  if (value.headingFontSizeScale !== undefined) {
    return fontSizePxFromLegacyScale(value.headingFontSizeScale, DEFAULT_STORE_NAME_FONT_PX);
  }
  return fontSizePxFromLegacyScale(legacyScale, DEFAULT_STORE_NAME_FONT_PX);
};

const normalizeProductNameFontSizePx = (value = {}, legacyScale) => {
  if (value.productNameFontSizePx !== undefined) {
    return normalizeFontSizePx(value.productNameFontSizePx, DEFAULT_PRODUCT_NAME_FONT_PX);
  }
  if (value.bodyFontSizePx !== undefined) {
    return normalizeFontSizePx(value.bodyFontSizePx, DEFAULT_PRODUCT_NAME_FONT_PX);
  }
  if (value.bodyFontSizeScale !== undefined) {
    return fontSizePxFromLegacyScale(value.bodyFontSizeScale, DEFAULT_PRODUCT_NAME_FONT_PX);
  }
  return fontSizePxFromLegacyScale(legacyScale, DEFAULT_PRODUCT_NAME_FONT_PX);
};

const normalizeOtherFieldFontSizePx = (value = {}, key, defaultPx, legacyScale) => {
  if (value[key] !== undefined) {
    return normalizeFontSizePx(value[key], defaultPx);
  }
  if (value.otherFieldsFontSizePx !== undefined) {
    return normalizeFontSizePx(value.otherFieldsFontSizePx, defaultPx);
  }
  if (value.bodyFontSizePx !== undefined) {
    return normalizeFontSizePx(value.bodyFontSizePx, defaultPx);
  }
  if (value.bodyFontSizeScale !== undefined) {
    return fontSizePxFromLegacyScale(value.bodyFontSizeScale, defaultPx);
  }
  return fontSizePxFromLegacyScale(legacyScale, defaultPx);
};

const normalizeMrpFontSizePx = (value = {}, legacyScale) =>
  normalizeOtherFieldFontSizePx(value, "mrpFontSizePx", DEFAULT_MRP_FONT_PX, legacyScale);

const normalizeDiscountFontSizePx = (value = {}, legacyScale) =>
  normalizeOtherFieldFontSizePx(value, "discountFontSizePx", DEFAULT_DISCOUNT_FONT_PX, legacyScale);

const normalizePriceFontSizePx = (value = {}, legacyScale) =>
  normalizeOtherFieldFontSizePx(value, "priceFontSizePx", DEFAULT_PRICE_FONT_PX, legacyScale);

const normalizeNoteFontSizePx = (value = {}, legacyScale) =>
  normalizeOtherFieldFontSizePx(value, "noteFontSizePx", DEFAULT_NOTE_FONT_PX, legacyScale);

const normalizeBarcodeNumberFontSizePx = (value = {}, legacyScale) =>
  normalizeOtherFieldFontSizePx(value, "barcodeNumberFontSizePx", DEFAULT_BARCODE_NUMBER_FONT_PX, legacyScale);

const normalizeFieldPosition = (value, fallback = "left") => {
  const raw = String(value || "").trim().toLowerCase();
  return WAREHOUSE_BARCODE_POSITION_OPTIONS.some((option) => option.value === raw)
    ? raw
    : fallback;
};

const normalizeFieldPriority = (value, fallback = 1) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const digits = String(value).trim().replace(/[^\d]/g, "");
  if (!digits) return fallback;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
};

const normalizeLabelFields = (value = {}) => {
  const rawFields = value.labelFields && typeof value.labelFields === "object"
    ? value.labelFields
    : {};
  const next = buildFieldDefaults(WAREHOUSE_BARCODE_FIELD_DEFINITIONS);

  WAREHOUSE_BARCODE_FIELD_DEFINITIONS.forEach((definition) => {
    const raw = rawFields[definition.key] || {};
    next[definition.key] = {
      visible: raw.visible !== undefined
        ? Boolean(raw.visible)
        : next[definition.key].visible,
      ...(definition.hasPosition ? {
        position: normalizeFieldPosition(
          raw.position,
          next[definition.key].position || definition.defaultPosition || "left"
        ),
      } : {}),
      ...(definition.hasPriority ? {
        priority: normalizeFieldPriority(
          raw.priority,
          next[definition.key].priority || definition.defaultPriority || 1
        ),
      } : {}),
    };
  });

  if (value.showStoreName !== undefined) {
    next.storeName.visible = Boolean(value.showStoreName);
  }
  if (value.showMrp !== undefined) {
    next.mrp.visible = Boolean(value.showMrp);
  }
  if (value.showDiscount !== undefined) {
    next.discount.visible = Boolean(value.showDiscount);
  }
  if (value.showRs !== undefined) {
    next.rs.visible = Boolean(value.showRs);
  }
  if (value.showPrice !== undefined && value.showRs === undefined) {
    next.rs.visible = Boolean(value.showPrice);
  }

  return next;
};

export const normalizeWarehouseBarcodeCustomization = (value = {}) => {
  const legacyFontScale = normalizeLegacyFontSizeScale(
    value.fontSizeScale,
    100
  );

  return {
    codeType: String(value.codeType || "").trim().toLowerCase() === "code" ? "code" : "barcode",
    codePosition: normalizeFieldPosition(
      value.codePosition ?? value.qrCodePosition,
      DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.codePosition
    ),
    note: String(value.note || "").trim(),
    labelWidthMm: normalizeDimension(
      value.labelWidthMm,
      DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.labelWidthMm
    ),
    labelHeightMm: normalizeDimension(
      value.labelHeightMm,
      DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.labelHeightMm
    ),
    topBandHeightMm: Math.max(
      0,
      Math.min(
        30,
        Number.isFinite(Number(value.topBandHeightMm))
          ? Math.round(Number(value.topBandHeightMm) * 100) / 100
          : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.topBandHeightMm
      )
    ),
    labelsPerRow: [1, 2, 3].includes(Number(value.labelsPerRow))
      ? Number(value.labelsPerRow)
      : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.labelsPerRow,
    storeNameFontSizePx: normalizeStoreNameFontSizePx(value, legacyFontScale),
    productNameFontSizePx: normalizeProductNameFontSizePx(value, legacyFontScale),
    mrpFontSizePx: normalizeMrpFontSizePx(value, legacyFontScale),
    discountFontSizePx: normalizeDiscountFontSizePx(value, legacyFontScale),
    priceFontSizePx: normalizePriceFontSizePx(value, legacyFontScale),
    noteFontSizePx: normalizeNoteFontSizePx(value, legacyFontScale),
    barcodeNumberFontSizePx: normalizeBarcodeNumberFontSizePx(value, legacyFontScale),
    barcodeSizeMm: normalizeDimension(
      value.barcodeSizeMm,
      DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.barcodeSizeMm
    ),
    qrCodeSizeMm: normalizeDimension(
      value.qrCodeSizeMm,
      DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.qrCodeSizeMm
    ),
    fontFamily: normalizeFontFamily(value.fontFamily),
    fontBold: value.fontBold !== undefined
      ? Boolean(value.fontBold)
      : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.fontBold,
    fontItalic: value.fontItalic !== undefined
      ? Boolean(value.fontItalic)
      : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.fontItalic,
    fontUnderline: value.fontUnderline !== undefined
      ? Boolean(value.fontUnderline)
      : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.fontUnderline,
    labelFields: normalizeLabelFields(value),
  };
};

export const getWarehouseLabelField = (customization = {}, key) => {
  const normalized = normalizeWarehouseBarcodeCustomization(customization);
  return normalized.labelFields?.[key] || { visible: false, position: "left", priority: 1 };
};

export const getWarehouseCodePosition = (customization = {}) =>
  normalizeWarehouseBarcodeCustomization(customization).codePosition || "left";

export const getWarehouseQrCodePosition = getWarehouseCodePosition;

export const isWarehouseLabelFieldVisible = (customization = {}, key) =>
  Boolean(getWarehouseLabelField(customization, key).visible);

export const getWarehouseLabelFieldPosition = (customization = {}, key) =>
  getWarehouseLabelField(customization, key).position || "left";

export const getWarehouseLabelFieldPriority = (customization = {}, key) =>
  Math.max(1, Number(getWarehouseLabelField(customization, key).priority) || 1);

export const getWarehouseEffectiveFieldPosition = (position, codePosition = "left") => {
  const normalizedPosition = normalizeFieldPosition(position, "left");
  const normalizedCodePosition = normalizeFieldPosition(codePosition, "left");
  if (normalizedCodePosition === "center" && normalizedPosition === "center") {
    return "left";
  }
  return normalizedPosition;
};

export const getWarehouseLabelFieldAlignClass = (position) => {
  if (position === "center") return "text-center";
  if (position === "right") return "text-right";
  return "text-left";
};

export const getWarehouseLabelFieldJustifyClass = (position) => {
  if (position === "center") return "justify-center";
  if (position === "right") return "justify-end";
  return "justify-start";
};

export const getWarehouseLabelFieldTextAlign = (position) => {
  if (position === "center") return "center";
  if (position === "right") return "right";
  return "left";
};

export const getWarehouseLabelFieldFlexJustifyContent = (position) => {
  if (position === "center") return "center";
  if (position === "right") return "flex-end";
  return "flex-start";
};

export const buildWarehouseLabelTextStyle = (customization = {}) => {
  const normalized = normalizeWarehouseBarcodeCustomization(customization);
  return {
    fontFamily: WAREHOUSE_FONT_FAMILY_STACKS[normalized.fontFamily]
      || WAREHOUSE_FONT_FAMILY_STACKS.arial,
    fontWeight: normalized.fontBold ? 700 : 400,
    fontStyle: normalized.fontItalic ? "italic" : "normal",
    textDecoration: normalized.fontUnderline ? "underline" : "none",
  };
};

const getStorageKey = (companyId) => {
  const normalizedCompanyId = String(companyId || "").trim();
  return normalizedCompanyId && normalizedCompanyId !== "default"
    ? `${STORAGE_KEY}.${normalizedCompanyId}`
    : STORAGE_KEY;
};

export const loadWarehouseBarcodeCustomization = (companyId) => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION };
  }

  try {
    const key = getStorageKey(companyId);
    let raw = window.localStorage.getItem(key);
    if (!raw && key !== STORAGE_KEY) {
      raw = window.localStorage.getItem(STORAGE_KEY);
    }
    if (!raw) return { ...DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION };
    return normalizeWarehouseBarcodeCustomization(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION };
  }
};

export const saveWarehouseBarcodeCustomization = (companyIdOrValue, valueIfCompanyId) => {
  let companyId = null;
  let value = companyIdOrValue;
  if (valueIfCompanyId !== undefined) {
    companyId = companyIdOrValue;
    value = valueIfCompanyId;
  } else if (typeof companyIdOrValue === "string" || typeof companyIdOrValue === "number") {
    companyId = companyIdOrValue;
    value = {};
  }

  const normalized = normalizeWarehouseBarcodeCustomization(value);
  if (typeof window !== "undefined") {
    const key = getStorageKey(companyId);
    window.localStorage.setItem(key, JSON.stringify(normalized));
    if (key !== STORAGE_KEY) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  }
  return normalized;
};

export const applyServerWarehouseBarcodeCustomization = (companyId, serverData = {}) => {
  if (!serverData || Object.keys(serverData).length === 0) {
    return loadWarehouseBarcodeCustomization(companyId);
  }
  const merged = normalizeWarehouseBarcodeCustomization({
    ...DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION,
    ...serverData,
  });
  return saveWarehouseBarcodeCustomization(companyId, merged);
};

export const fetchWarehouseBarcodeCustomization = async (
  apiClient,
  companyId,
  { fallbackToLocal = true } = {}
) => {
  const storageKey = String(companyId || "").trim();
  try {
    const res = await apiClient.get("/warehouse-customisation", {
      params: companyId ? { company_id: companyId } : {},
    });
    const serverData = res.data?.data;
    if (serverData && Object.keys(serverData).length > 0 && (serverData.labelWidthMm || serverData.labelFields || serverData.codeType)) {
      return applyServerWarehouseBarcodeCustomization(storageKey, serverData);
    }
    return loadWarehouseBarcodeCustomization(storageKey);
  } catch {
    if (fallbackToLocal) {
      return loadWarehouseBarcodeCustomization(storageKey);
    }
    return normalizeWarehouseBarcodeCustomization(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  }
};

export const createDefaultWarehouseBarcodeCustomization = () =>
  normalizeWarehouseBarcodeCustomization({
    ...DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION,
    labelFields: buildFieldDefaults(WAREHOUSE_BARCODE_FIELD_DEFINITIONS),
  });

export const resetWarehouseBarcodeCustomization = (companyId) => {
  const defaults = createDefaultWarehouseBarcodeCustomization();
  return saveWarehouseBarcodeCustomization(companyId, defaults);
};

export const getWarehouseLabelFieldFontMm = (metrics = {}, fieldKey) => {
  if (fieldKey === "mrp") return metrics.mrpFontMm;
  if (fieldKey === "discount") return metrics.discountFontMm;
  if (fieldKey === "rs") return metrics.priceFontMm;
  return metrics.priceFontMm;
};

export const getWarehouseOrderedFields = (customization = {}, fields = []) => {
  const normalizedFields = Array.isArray(fields) ? fields : [];
  return [...normalizedFields].sort((left, right) => {
    const leftPriority = getWarehouseLabelFieldPriority(customization, left.key);
    const rightPriority = getWarehouseLabelFieldPriority(customization, right.key);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftIndex = WAREHOUSE_BARCODE_FIELD_DEFINITIONS.findIndex((field) => field.key === left.key);
    const rightIndex = WAREHOUSE_BARCODE_FIELD_DEFINITIONS.findIndex((field) => field.key === right.key);
    return leftIndex - rightIndex;
  });
};

export const splitWarehouseLabelFieldsForCenter = (customization = {}, fields = []) => {
  const codePosition = getWarehouseCodePosition(customization);
  const normalizedFields = getWarehouseOrderedFields(customization, fields);
  if (codePosition !== "center") {
    return {
      leftFields: normalizedFields,
      rightFields: [],
    };
  }

  return {
    leftFields: normalizedFields.filter((field) =>
      getWarehouseEffectiveFieldPosition(
        getWarehouseLabelFieldPosition(customization, field.key),
        codePosition
      ) !== "right"
    ),
    rightFields: normalizedFields.filter((field) =>
      getWarehouseEffectiveFieldPosition(
        getWarehouseLabelFieldPosition(customization, field.key),
        codePosition
      ) === "right"
    ),
  };
};

export const getWarehouseStickerMetrics = (customization = {}) => {
  const normalized = normalizeWarehouseBarcodeCustomization(customization);
  const labelWidthMm = normalized.labelWidthMm;
  const labelHeightMm = normalized.labelHeightMm;
  const widthScale = labelWidthMm / DEFAULT_LABEL_WIDTH_MM;
  const heightScale = labelHeightMm / DEFAULT_LABEL_HEIGHT_MM;
  const scale = Math.max(0.45, Math.min(widthScale, heightScale));
  const storeNameScale = normalized.storeNameFontSizePx / DEFAULT_STORE_NAME_FONT_PX;
  const productNameScale = normalized.productNameFontSizePx / DEFAULT_PRODUCT_NAME_FONT_PX;
  const mrpScale = normalized.mrpFontSizePx / DEFAULT_MRP_FONT_PX;
  const discountScale = normalized.discountFontSizePx / DEFAULT_DISCOUNT_FONT_PX;
  const priceScale = normalized.priceFontSizePx / DEFAULT_PRICE_FONT_PX;
  const noteScale = normalized.noteFontSizePx / DEFAULT_NOTE_FONT_PX;
  const barcodeNumberScale = normalized.barcodeNumberFontSizePx / DEFAULT_BARCODE_NUMBER_FONT_PX;
  const scaleStoreNameText = (value) => Math.round(value * storeNameScale * 100) / 100;
  const scaleProductNameText = (value) => Math.round(value * productNameScale * 100) / 100;
  const scaleMrpText = (value) => Math.round(value * mrpScale * 100) / 100;
  const scaleDiscountText = (value) => Math.round(value * discountScale * 100) / 100;
  const scalePriceText = (value) => Math.round(value * priceScale * 100) / 100;
  const scaleNoteText = (value) => Math.round(value * noteScale * 100) / 100;
  const scaleBarcodeNumberText = (value) => Math.round(value * barcodeNumberScale * 100) / 100;
  const topBandHeightMm = Math.max(
    0,
    Math.min(
      Number.isFinite(Number(normalized.topBandHeightMm))
        ? Math.round(Number(normalized.topBandHeightMm) * 100) / 100
        : DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION.topBandHeightMm,
      Math.max(labelHeightMm - (6 * scale), 0)
    )
  );

  const barcodeHeightMm = Math.round(normalized.barcodeSizeMm * scale * 100) / 100;
  const qrSizeMm = Math.round(normalized.qrCodeSizeMm * scale * 100) / 100;
  const codeColumnWidthMm = Math.max(
    10,
    Math.round((Math.max(barcodeHeightMm, qrSizeMm) + (2.5 * scale)) * 100) / 100
  );

  return {
    labelWidthMm,
    labelHeightMm,
    topBandHeightMm,
    labelsPerRow: normalized.labelsPerRow,
    scale,
    codeColumnWidthMm,
    qrSizeMm,
    barcodeHeightMm,
    bodyGapMm: Math.max(0.8, Math.round(1.25 * scale * 100) / 100),
    bodyPadXMm: Math.max(0.8, Math.round(1.6 * scale * 100) / 100),
    bodyPadYMm: Math.max(0.8, Math.round(1.2 * scale * 100) / 100),
    codeTextFontMm: scaleBarcodeNumberText(Math.max(1.6, Math.round(2.2 * scale * 100) / 100)),
    storeNameFontMm: scaleStoreNameText(Math.max(2, Math.round(3 * scale * 100) / 100)),
    productNameFontMm: scaleProductNameText(Math.max(1.9, Math.round(2.6 * scale * 100) / 100)),
    mrpFontMm: scaleMrpText(Math.max(1.8, Math.round(2.35 * scale * 100) / 100)),
    discountFontMm: scaleDiscountText(Math.max(1.8, Math.round(2.35 * scale * 100) / 100)),
    priceFontMm: scalePriceText(Math.max(1.8, Math.round(2.35 * scale * 100) / 100)),
    noteFontMm: scaleNoteText(Math.max(1.6, Math.round(2.2 * scale * 100) / 100)),
    noteMarginTopMm: Math.max(0.2, Math.round(0.35 * scale * 100) / 100),
    fieldsMarginTopMm: Math.max(0.5, Math.round(1 * scale * 100) / 100),
    fieldRowGapMm: Math.max(0.15, Math.round(0.25 * scale * 100) / 100),
    codeTextMarginTopMm: Math.max(0.3, Math.round(0.6 * scale * 100) / 100),
    storeNameLetterSpacingEm: 0.03,
    textStyle: buildWarehouseLabelTextStyle(normalized),
    labelFields: normalized.labelFields,
  };
};
