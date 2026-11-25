/**
 * Employee sticker size. Saved per store in Sales Customisation (`employeeSticker`), and applied on top of the product
 * label settings from Warehouse > Barcode Customisation (printer, margins, font, print mode stay shared). With nothing
 * saved, employee stickers use the product sticker size as before. The server keeps the same ranges.
 */
export const EMPLOYEE_STICKER_LIMITS = {
  labelWidthMm: { min: 20, max: 200, step: 0.5, label: "Width (mm)" },
  labelHeightMm: { min: 10, max: 150, step: 0.5, label: "Height (mm)" },
  labelsPerRow: { min: 1, max: 3, step: 1, label: "Stickers per row" },
  codeSizeMm: { min: 5, max: 60, step: 0.5, label: "QR / barcode size (mm)" },
  nameFontSizePx: { min: 6, max: 40, step: 1, label: "Name font size (px)" },
  detailFontSizePx: { min: 6, max: 40, step: 1, label: "Details font size (px)" },
};

/** Common label roll sizes (width x height, mm). */
export const EMPLOYEE_STICKER_PRESETS = [
  { width: 38, height: 25 },
  { width: 50, height: 25 },
  { width: 50, height: 30 },
  { width: 60, height: 40 },
  { width: 75, height: 50 },
  { width: 100, height: 50 },
];

const number = (value) => (value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value));
const clamp = (key, value) => {
  const { min, max } = EMPLOYEE_STICKER_LIMITS[key];
  return Math.min(max, Math.max(min, value));
};

/** The size in use: the saved value for each setting, else what the product sticker uses. */
export const effectiveEmployeeStickerSize = (saved, product = {}) => {
  const base = {
    labelWidthMm: number(product.labelWidthMm) ?? 50,
    labelHeightMm: number(product.labelHeightMm) ?? 25,
    labelsPerRow: number(product.labelsPerRow) ?? 2,
    codeSizeMm: number(product.codeType === "barcode" ? product.barcodeSizeMm : product.qrCodeSizeMm) ?? 13.5,
    nameFontSizePx: number(product.productNameFontSizePx) ?? 10,
    detailFontSizePx: number(product.priceFontSizePx) ?? 10,
  };
  const size = {};
  for (const key of Object.keys(EMPLOYEE_STICKER_LIMITS)) {
    const value = number(saved?.[key]);
    size[key] = clamp(key, value ?? base[key]);
  }
  return size;
};

/** Product label settings with the employee sticker size laid over them. Without a saved size, nothing changes. */
export const applyEmployeeStickerSize = (customization, saved) => {
  if (!saved || typeof saved !== "object" || Object.keys(saved).length === 0) return customization;
  const size = effectiveEmployeeStickerSize(saved, customization);
  return {
    ...customization,
    labelWidthMm: size.labelWidthMm,
    labelHeightMm: size.labelHeightMm,
    labelsPerRow: size.labelsPerRow,
    qrCodeSizeMm: size.codeSizeMm,
    barcodeSizeMm: size.codeSizeMm,
    productNameFontSizePx: size.nameFontSizePx,
    priceFontSizePx: size.detailFontSizePx,
    noteFontSizePx: size.detailFontSizePx,
  };
};

export const formatEmployeeStickerSize = (size) => `${size.labelWidthMm} × ${size.labelHeightMm} mm`;

/** What the server stores: every setting as a clamped number. Returns null when a field is not a number. */
export const employeeStickerPayload = (form) => {
  const payload = {};
  for (const key of Object.keys(EMPLOYEE_STICKER_LIMITS)) {
    const value = number(form?.[key]);
    if (value === null) return null;
    payload[key] = clamp(key, key === "labelsPerRow" || key.endsWith("Px") ? Math.round(value) : Math.round(value * 100) / 100);
  }
  return payload;
};
