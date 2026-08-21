import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Search, Save, Printer, Eye, X } from "lucide-react";
import QRCode from "qrcode";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";
import { usePrintContext } from "../../context/PrintContext";
import { buildCode39SvgMarkup } from "../../utils/salesReceiptCustomization";
import {
  DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION,
  getWarehouseCodePosition,
  getWarehouseEffectiveFieldPosition,
  getWarehouseLabelFieldAlignClass,
  getWarehouseLabelFieldFlexJustifyContent,
  getWarehouseLabelFieldFontMm,
  getWarehouseLabelFieldJustifyClass,
  getWarehouseOrderedFields,
  getWarehouseLabelFieldPosition,
  getWarehouseLabelFieldTextAlign,
  getWarehouseStickerMetrics,
  isWarehouseLabelFieldVisible,
  loadWarehouseBarcodeCustomization,
  fetchWarehouseBarcodeCustomization,
  splitWarehouseLabelFieldsForCenter,
} from "../../utils/warehouseBarcodeCustomization";

/* ── Resizable column hook ─────────────────────────────────────── */
const useResizableColumns = (initialWidths) => {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef(null);

  const onMouseDown = useCallback((colIndex, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[colIndex];

    const onMouseMove = (ev) => {
      const diff = ev.clientX - startX;
      setWidths((prev) => {
        const next = [...prev];
        next[colIndex] = Math.max(30, startW + diff);
        return next;
      });
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      dragging.current = null;
    };
    dragging.current = colIndex;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [widths]);

  return { widths, onMouseDown };
};

const EMPTY_EDITOR_OPTIONS = {
  products: [],
  brands: [],
  styles: [],
  materials: [],
  patterns: [],
  sleeves: [],
  fits: [],
  types: [],
  colors: [],
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDisplayText = (value) => {
  const text = String(value || "").trim();
  return text || "-";
};

const normalizeLookupKey = (value) => String(value || "").trim().toLowerCase();
const normalizeVariantProductKey = (value) => normalizeLookupKey(value === "-" ? "" : value);
const normalizeVariantSizeKey = (value) => normalizeLookupKey(value === "-" ? "" : value);
const formatVariantPriceKey = (value) => toNumber(value, 0).toFixed(2);
const buildVariantKey = ({ productName, size, sellingPrice }) => {
  const productKey = normalizeVariantProductKey(productName);
  if (!productKey) return "";
  return `${productKey}::${normalizeVariantSizeKey(size)}::${formatVariantPriceKey(sellingPrice)}`;
};
const getBarcodeRowVariantKey = (row) =>
  buildVariantKey({
    productName: row?.product_name,
    size: row?.size,
    sellingPrice: row?.selling_price ?? row?.final_price ?? row?.mrp,
  });
const getItemVariantKey = (item) =>
  buildVariantKey({
    productName: item?.productName,
    size: item?.size,
    sellingPrice: item?.sellingPrice,
  });

const BARCODE_RANGE_PATTERN = /^([A-Z]{2})(\d{5})([A-Z])$/i;

const compareBarcodeValues = (left, right) => {
  const a = String(left || "").trim().toUpperCase();
  const b = String(right || "").trim().toUpperCase();
  const aMatch = a.match(BARCODE_RANGE_PATTERN);
  const bMatch = b.match(BARCODE_RANGE_PATTERN);

  if (aMatch && bMatch) {
    if (aMatch[1] !== bMatch[1]) return aMatch[1].localeCompare(bMatch[1]);
    if (aMatch[3] !== bMatch[3]) return aMatch[3].localeCompare(bMatch[3]);
    return Number(aMatch[2]) - Number(bMatch[2]);
  }

  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

const buildBarcodeRange = (values = []) => {
  const uniqueValues = [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];

  if (uniqueValues.length === 0) return "";
  if (uniqueValues.length === 1) return uniqueValues[0];

  const sorted = uniqueValues.sort(compareBarcodeValues);
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
};

const sourceItemKey = (sourceItemId) => String(sourceItemId);

const isGeneratedItem = (generatedIds, sourceItemId) =>
  generatedIds.has(sourceItemKey(sourceItemId));

const barcodeForItem = (barcodeMap, sourceItemId) =>
  barcodeMap[sourceItemKey(sourceItemId)] || barcodeMap[sourceItemId] || "";

const buildBarcodeRangeMap = (rows = [], keySelector) => {
  const grouped = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = keySelector(row);
    const barcode = String(row?.barcode || "").trim();
    if (key === undefined || key === null || !barcode) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(barcode);
  });

  const ranges = new Map();
  grouped.forEach((values, key) => {
    ranges.set(key, buildBarcodeRange(values));
  });
  return ranges;
};

const groupRowsByKey = (rows = [], keySelector) => {
  const grouped = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = keySelector(row);
    if (key === undefined || key === null || key === "") return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  return grouped;
};

const assignDirectPurchaseBarcodeRanges = (items = [], barcodeRows = []) => {
  const rangesByInventoryItemId = buildBarcodeRangeMap(
    barcodeRows,
    (row) => Number(row?.inventory_item_id ?? row?.inventoryItemId ?? 0) || null
  );
  const rangesByVariantKey = buildBarcodeRangeMap(barcodeRows, getBarcodeRowVariantKey);
  const assignedRanges = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const primaryInventoryItemId = Number(item?.primaryInventoryItemId || 0) || null;
    const barcodeRange =
      (primaryInventoryItemId ? rangesByInventoryItemId.get(primaryInventoryItemId) : "")
      || rangesByVariantKey.get(getItemVariantKey(item))
      || "";
    if (!barcodeRange) return;
    assignedRanges.set(item.sourceItemId, barcodeRange);
  });

  return assignedRanges;
};

const calcFinalPrice = (mrp, discountPerc) => {
  const safeMrp = toNumber(mrp);
  const safeDiscount = toNumber(discountPerc);
  return Math.round((safeMrp - (safeMrp * safeDiscount / 100) + Number.EPSILON) * 100) / 100;
};

const findOptionLabel = (options, value, fallback = "-") => {
  const matched = options.find((option) => String(option.value) === String(value));
  return matched?.label || fallback;
};

const formatStickerAmount = (value) => toNumber(value, 0).toFixed(2);

const formatStickerDiscount = (value) => {
  const discount = toNumber(value, 0);
  return Number.isInteger(discount) ? `${discount}%` : `${discount.toFixed(2)}%`;
};

const buildStickerFields = ({ customization, mrp, discountPerc, price }) => {
  const fields = [];
  if (isWarehouseLabelFieldVisible(customization, "mrp")) {
    fields.push({ key: "mrp", label: "MRP", value: formatStickerAmount(mrp) });
  }
  if (isWarehouseLabelFieldVisible(customization, "discount")) {
    fields.push({ key: "discount", label: "Disc", value: formatStickerDiscount(discountPerc) });
  }
  if (isWarehouseLabelFieldVisible(customization, "rs")) {
    fields.push({ key: "rs", label: "Rs", value: formatStickerAmount(price) });
  }
  return fields;
};

const assignDirectPurchaseBarcodeValueMap = (items = [], barcodeRows = []) => {
  const rowsByInventoryItemId = groupRowsByKey(
    barcodeRows,
    (row) => Number(row?.inventory_item_id || 0) || null
  );
  const rowsByVariantKey = groupRowsByKey(barcodeRows, getBarcodeRowVariantKey);
  const assignedValues = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const primaryInventoryItemId = Number(item?.primaryInventoryItemId || 0) || null;
    const matchedRows =
      (primaryInventoryItemId ? rowsByInventoryItemId.get(primaryInventoryItemId) : null)
      || rowsByVariantKey.get(getItemVariantKey(item))
      || [];
    if (matchedRows.length > 0) assignedValues.set(item.sourceItemId, matchedRows);
  });

  return assignedValues;
};

const buildTransportBarcodeValueMap = (items = [], barcodeRows = []) => {
  const byInventoryItemId = groupRowsByKey(
    barcodeRows,
    (row) => Number(row?.inventory_item_id || 0) || null
  );
  const byVariantKey = groupRowsByKey(barcodeRows, getBarcodeRowVariantKey);

  const assignedValues = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const inventoryItemId = Number(item?.inventoryItemId || 0) || null;
    const values =
      (inventoryItemId ? byInventoryItemId.get(inventoryItemId) : null)
      || byVariantKey.get(getItemVariantKey(item))
      || [];
    if (values.length > 0) assignedValues.set(item.sourceItemId, values);
  });

  return assignedValues;
};

const getItemBarcodeRows = (item, barcodeValuesMap, barcodeMap) => {
  if (!item) return [];
  const mappedRows =
    barcodeValuesMap.get(item.sourceItemId)
    || barcodeValuesMap.get(sourceItemKey(item.sourceItemId))
    || [];
  if (mappedRows.length > 0) return mappedRows;
  const fallbackValue = String(barcodeForItem(barcodeMap, item.sourceItemId) || "").trim();
  return fallbackValue ? [{ barcode: fallbackValue }] : [];
};

const buildStickerLabels = ({
  item,
  barcodeRows,
  customization,
}) => {
  const rows = Array.isArray(barcodeRows) ? barcodeRows.filter((row) => String(row?.barcode || "").trim()) : [];
  const itemQty = Math.max(0, Math.trunc(toNumber(item?.qty, 0)));
  const previewRows =
    rows.length === 1 && itemQty > 1
      ? Array.from({ length: itemQty }, (_, index) => ({
          ...rows[0],
          __previewRepeatIndex: index,
        }))
      : rows;
  const basePrice = toNumber(item?.finalPrice ?? item?.sellingPrice ?? item?.mrp, 0);
  const baseMrp = toNumber(item?.mrp ?? item?.sellingPrice ?? item?.finalPrice, 0);
  const baseDiscountPerc = toNumber(item?.discountPerc, 0);
  const note = String(customization?.note || "").trim();

  const labels = previewRows.map((row, index) => ({
    key: `${item?.sourceItemId || item?.id || "item"}-${row?.id || "preview"}-${row?.__previewRepeatIndex ?? index}`,
    codeValue: String(row?.barcode || "").trim(),
    codeType: String(row?.code_type || customization?.codeType || "barcode").trim().toLowerCase() === "code"
      ? "code"
      : "barcode",
    productName: String(item?.productName || row?.product_name || "").trim() || "-",
    fields: buildStickerFields({
      customization,
      mrp: toNumber(row?.mrp, baseMrp),
      discountPerc: toNumber(row?.discount_perc, baseDiscountPerc),
      price: toNumber(row?.final_price ?? row?.selling_price, basePrice),
    }),
    note,
  })).filter((label) => label.codeValue);

  if (labels.length > 0) return labels;

  return [];
};

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeXml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const MM_TO_PX = 96 / 25.4;
const BARCODE_SHEET_ROW_GAP_MM = 1;
const BARCODE_RENDER_SCALE = 2;

const svgToDataUrl = (svgMarkup) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svgMarkup || "").trim())}`;

const mmToPx = (value) => (Number(value || 0) || 0) * MM_TO_PX;

const buildBarcodeSheetMarkup = ({
  labels = [],
  customization,
  storeName = "",
  qrSources = {},
}) => {
  const metrics = getWarehouseStickerMetrics(customization);
  const textStyle = metrics.textStyle;
  const storeNamePosition = getWarehouseLabelFieldPosition(customization, "storeName");
  const productNamePosition = getWarehouseLabelFieldPosition(customization, "productName");
  const notePosition = getWarehouseLabelFieldPosition(customization, "note");
  const codePosition = getWarehouseCodePosition(customization);
  const showStoreNameHeader = isWarehouseLabelFieldVisible(customization, "storeName") && storeName;
  const showProductName = isWarehouseLabelFieldVisible(customization, "productName");
  const showNote = isWarehouseLabelFieldVisible(customization, "note") && customization.note;
  const buildFieldsHtml = (fields) =>
    fields.map((field) => {
      const fieldPosition = getWarehouseEffectiveFieldPosition(
        getWarehouseLabelFieldPosition(customization, field.key),
        codePosition
      );
      return `
        <div class="field-row" style="justify-content: ${getWarehouseLabelFieldFlexJustifyContent(fieldPosition)}; text-align: ${getWarehouseLabelFieldTextAlign(fieldPosition)}; font-size: ${getWarehouseLabelFieldFontMm(metrics, field.key)}mm;">
          <span class="field-label">${escapeHtml(field.label)}</span>
          <span class="field-value">${escapeHtml(field.value)}</span>
        </div>
      `;
    }).join("");

  const cardsHtml = labels.map((label) => {
    const barcodeMarkup = label.codeType === "barcode"
      ? buildCode39SvgMarkup(label.codeValue, {
          height: 42,
          narrowWidth: 1.2,
          wideWidth: 3.2,
          quietZone: 8,
          showText: false,
        })
      : "";
    const qrImgHtml = qrSources[label.key]
      ? `<img src="${qrSources[label.key]}" alt="${escapeHtml(label.codeValue)}" class="qr-img" />`
      : `<div class="qr-placeholder"></div>`;
    const headerHtml = metrics.topBandHeightMm > 0
      ? `
          <div class="label-header" style="justify-content: ${getWarehouseLabelFieldFlexJustifyContent(storeNamePosition)}; text-align: ${getWarehouseLabelFieldTextAlign(storeNamePosition)};">
            ${showStoreNameHeader ? `<div class="store-name" style="text-align: ${getWarehouseLabelFieldTextAlign(storeNamePosition)};">${escapeHtml(storeName)}</div>` : ""}
          </div>
        `
      : "";
    const visibleFields = (Array.isArray(label.fields) ? label.fields : []).filter((field) => {
      if (field.key === "mrp") return isWarehouseLabelFieldVisible(customization, "mrp");
      if (field.key === "discount") return isWarehouseLabelFieldVisible(customization, "discount");
      if (field.key === "rs") return isWarehouseLabelFieldVisible(customization, "rs");
      return true;
    });
    const orderedVisibleFields = getWarehouseOrderedFields(customization, visibleFields);
    const { leftFields, rightFields } = splitWarehouseLabelFieldsForCenter(customization, orderedVisibleFields);
    const isCodeRight = codePosition === "right";
    const isCodeCentered = codePosition === "center";
    const fieldsHtml = orderedVisibleFields.length > 0
      ? `<div class="fields-wrap">${buildFieldsHtml(orderedVisibleFields)}</div>`
      : "";
    const leftFieldsHtml = leftFields.length > 0
      ? `<div class="fields-wrap">${buildFieldsHtml(leftFields)}</div>`
      : "";
    const rightFieldsHtml = rightFields.length > 0
      ? `<div class="fields-wrap">${buildFieldsHtml(rightFields)}</div>`
      : "";
    const codeColHtml = `
      <div class="code-col">
        ${label.codeType === "code" ? qrImgHtml : `<div class="barcode-svg">${barcodeMarkup}</div>`}
        <div class="code-text">${escapeHtml(label.codeValue)}</div>
      </div>
    `;
    const productNameHtml = showProductName ? `
      <div class="product-name-row" style="justify-content: ${getWarehouseLabelFieldFlexJustifyContent(productNamePosition)}; text-align: ${getWarehouseLabelFieldTextAlign(productNamePosition)};">
        <div class="product-name">${escapeHtml(label.productName)}</div>
      </div>
    ` : "";
    const noteHtml = showNote ? `
      <div class="note-text-row" style="justify-content: ${getWarehouseLabelFieldFlexJustifyContent(notePosition)}; text-align: ${getWarehouseLabelFieldTextAlign(notePosition)};">
        <div class="note-text">${escapeHtml(customization.note)}</div>
      </div>
    ` : "";

    return `
      <div class="label-card">
        ${headerHtml}
        <div class="label-body ${isCodeCentered ? "label-body-center" : ""}" style="${isCodeCentered ? "" : `grid-template-columns: ${isCodeRight ? `minmax(0, 1fr) ${metrics.codeColumnWidthMm}mm` : `${metrics.codeColumnWidthMm}mm minmax(0, 1fr)`};`}">
          ${isCodeCentered ? `
            ${productNameHtml}
            <div class="center-fields-row">
              <div class="content-col">${leftFieldsHtml}</div>
              ${codeColHtml}
              <div class="content-col">${rightFieldsHtml}</div>
            </div>
            ${noteHtml}
          ` : isCodeRight ? `
            <div class="content-col">
              ${productNameHtml}
              ${fieldsHtml}
              ${noteHtml}
            </div>
            ${codeColHtml}
          ` : `
            ${codeColHtml}
            <div class="content-col">
              ${productNameHtml}
              ${fieldsHtml}
              ${noteHtml}
            </div>
          `}
        </div>
      </div>
    `;
  }).join("");

  const styleMarkup = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${textStyle.fontFamily}; background: #ffffff; }
    .sheet { display: grid; grid-template-columns: repeat(${metrics.labelsPerRow}, ${metrics.labelWidthMm}mm); column-gap: 0; row-gap: ${BARCODE_SHEET_ROW_GAP_MM}mm; justify-content: start; padding: 0; width: ${metrics.labelWidthMm * metrics.labelsPerRow}mm; background: #ffffff; }
    .label-card { width: ${metrics.labelWidthMm}mm; height: ${metrics.labelHeightMm}mm; overflow: hidden; border: 0.2mm solid #d1d5db; border-radius: 3mm; background: #fff; }
    .label-header { min-height: ${metrics.topBandHeightMm}mm; display: flex; align-items: center; justify-content: center; padding: 0 1.5mm; text-align: center; }
    .store-name, .code-text, .product-name, .field-row, .note-text { font-family: ${textStyle.fontFamily}; font-weight: ${textStyle.fontWeight}; font-style: ${textStyle.fontStyle}; text-decoration: ${textStyle.textDecoration}; }
    .store-name { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${metrics.storeNameFontMm}mm; text-transform: uppercase; letter-spacing: ${metrics.storeNameLetterSpacingEm}em; color: #111827; }
    .label-body { display: grid; grid-template-columns: ${metrics.codeColumnWidthMm}mm minmax(0, 1fr); gap: ${metrics.bodyGapMm}mm; padding: ${metrics.bodyPadYMm}mm ${metrics.bodyPadXMm}mm; height: ${metrics.topBandHeightMm > 0 ? `calc(${metrics.labelHeightMm}mm - ${metrics.topBandHeightMm}mm)` : `${metrics.labelHeightMm}mm`}; }
    .label-body-center { display: flex; flex-direction: column; }
    .center-fields-row { display: grid; grid-template-columns: minmax(0, 1fr) ${metrics.codeColumnWidthMm}mm minmax(0, 1fr); column-gap: ${metrics.bodyGapMm}mm; align-items: center; min-height: 0; flex: 1; }
    .code-col { display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
    .barcode-svg { display: flex; max-height: ${metrics.barcodeHeightMm}mm; width: 100%; align-items: center; justify-content: center; overflow: hidden; }
    .barcode-svg svg { width: 100%; height: auto; max-height: ${metrics.barcodeHeightMm}mm; }
    .qr-img, .qr-placeholder { width: ${metrics.qrSizeMm}mm; height: ${metrics.qrSizeMm}mm; object-fit: contain; }
    .qr-placeholder { background: #f3f4f6; border-radius: 1mm; }
    .code-text { margin-top: ${metrics.codeTextMarginTopMm}mm; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-size: ${metrics.codeTextFontMm}mm; color: #374151; }
    .content-col { min-width: 0; overflow: hidden; }
    .product-name-row, .note-text-row { display: flex; width: 100%; align-items: center; }
    .product-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${metrics.productNameFontMm}mm; text-transform: uppercase; line-height: 1.2; color: #111827; }
    .fields-wrap { margin-top: ${metrics.fieldsMarginTopMm}mm; display: grid; row-gap: ${metrics.fieldRowGapMm}mm; }
    .field-row { display: flex; align-items: center; gap: ${metrics.bodyGapMm}mm; color: #1f2937; }
    .field-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: uppercase; }
    .field-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .note-text-row { margin-top: ${metrics.noteMarginTopMm}mm; }
    .note-text { max-width: 100%; font-size: ${metrics.noteFontMm}mm; line-height: 1.2; color: #374151; }
  `;

  const rowCount = Math.max(1, Math.ceil(labels.length / metrics.labelsPerRow));
  const sheetWidthMm = metrics.labelWidthMm * metrics.labelsPerRow;
  const sheetHeightMm =
    metrics.labelHeightMm * rowCount + BARCODE_SHEET_ROW_GAP_MM * Math.max(0, rowCount - 1);

  return {
    styleMarkup,
    cardsHtml,
    metrics,
    sheetWidthMm,
    sheetHeightMm,
    labels,
    customization,
    storeName,
    qrSources,
  };
};

const buildBarcodeSheetDocumentHtml = (markup, { autoPrint = false } = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Barcode Sticker Preview</title>
      <style>
        @page { margin: 0; size: ${markup.sheetWidthMm}mm ${markup.sheetHeightMm}mm; }
        html, body { width: ${markup.sheetWidthMm}mm; min-height: ${markup.sheetHeightMm}mm; }
        ${markup.styleMarkup}
      </style>
    </head>
    <body>
      <div class="sheet">${markup.cardsHtml}</div>
      ${autoPrint ? `
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      ` : ""}
    </body>
  </html>
`;

const buildBarcodeSheetSvgMarkup = (markup) => {
  const metrics = markup.metrics;
  const textStyle = metrics.textStyle;
  const labels = Array.isArray(markup.labels) ? markup.labels : [];
  const customization = markup.customization || {};
  const qrSources = markup.qrSources || {};
  const storeName = String(markup.storeName || "").trim();
  const labelsPerRow = Math.max(1, Number(metrics.labelsPerRow || 1) || 1);
  const rowGapMm = BARCODE_SHEET_ROW_GAP_MM;
  const labelWidthPx = mmToPx(metrics.labelWidthMm);
  const labelHeightPx = mmToPx(metrics.labelHeightMm);
  const rowGapPx = mmToPx(rowGapMm);
  const sheetWidthPx = mmToPx(markup.sheetWidthMm);
  const sheetHeightPx = mmToPx(markup.sheetHeightMm);
  const topBandPx = mmToPx(metrics.topBandHeightMm);
  const bodyPadXPx = mmToPx(metrics.bodyPadXMm);
  const bodyPadYPx = mmToPx(metrics.bodyPadYMm);
  const bodyGapPx = mmToPx(metrics.bodyGapMm);
  const codeColumnPx = mmToPx(metrics.codeColumnWidthMm);
  const barcodeHeightPx = mmToPx(metrics.barcodeHeightMm);
  const qrSizePx = mmToPx(metrics.qrSizeMm);
  const codeTextMarginTopPx = mmToPx(metrics.codeTextMarginTopMm);
  const fieldsMarginTopPx = mmToPx(metrics.fieldsMarginTopMm);
  const fieldRowGapPx = mmToPx(metrics.fieldRowGapMm);
  const noteMarginTopPx = mmToPx(metrics.noteMarginTopMm);
  const contentTopPx = topBandPx + bodyPadYPx;
  const contentBottomPx = labelHeightPx - bodyPadYPx;
  const contentHeightPx = Math.max(contentBottomPx - contentTopPx, 1);
  const codePosition = getWarehouseCodePosition(customization);
  const isCodeRight = codePosition === "right";
  const isCodeCentered = codePosition === "center";
  const showStoreNameHeader = isWarehouseLabelFieldVisible(customization, "storeName") && storeName;
  const showProductName = isWarehouseLabelFieldVisible(customization, "productName");
  const showNote = isWarehouseLabelFieldVisible(customization, "note") && customization.note;
  const storeNamePosition = getWarehouseLabelFieldPosition(customization, "storeName");
  const productNamePosition = getWarehouseLabelFieldPosition(customization, "productName");
  const notePosition = getWarehouseLabelFieldPosition(customization, "note");
  const centerX = labelWidthPx / 2;
  const centerY = contentTopPx + (contentHeightPx / 2);

  const getAnchor = (position) =>
    position === "right" ? "end" : position === "center" ? "middle" : "start";

  const getXForPosition = (position, left, width) =>
    position === "right"
      ? left + width
      : position === "center"
        ? left + (width / 2)
        : left;

  const buildTextNode = ({
    text,
    x,
    y,
    fontSizePx,
    anchor = "start",
    fill = "#111827",
    letterSpacing = 0,
    uppercase = false,
    fontWeight = textStyle.fontWeight,
  }) => {
    const content = uppercase ? String(text || "").toUpperCase() : String(text || "");
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${escapeXml(textStyle.fontFamily)}" font-size="${fontSizePx}" font-weight="${escapeXml(fontWeight)}" font-style="${escapeXml(textStyle.fontStyle)}" text-decoration="${escapeXml(textStyle.textDecoration)}" fill="${fill}"${letterSpacing ? ` letter-spacing="${letterSpacing}"` : ""}>${escapeXml(content)}</text>`;
  };

  const buildLabelSvg = (label, index) => {
    const rowIndex = Math.floor(index / labelsPerRow);
    const columnIndex = index % labelsPerRow;
    const offsetX = columnIndex * labelWidthPx;
    const offsetY = rowIndex * (labelHeightPx + rowGapPx);

    const visibleFields = (Array.isArray(label.fields) ? label.fields : []).filter((field) => {
      if (field.key === "mrp") return isWarehouseLabelFieldVisible(customization, "mrp");
      if (field.key === "discount") return isWarehouseLabelFieldVisible(customization, "discount");
      if (field.key === "rs") return isWarehouseLabelFieldVisible(customization, "rs");
      return true;
    });
    const orderedVisibleFields = getWarehouseOrderedFields(customization, visibleFields);
    const { leftFields, rightFields } = splitWarehouseLabelFieldsForCenter(customization, orderedVisibleFields);

    let contentLeftPx = bodyPadXPx;
    let contentRightPx = labelWidthPx - bodyPadXPx;

    if (!isCodeCentered) {
      if (isCodeRight) {
        contentRightPx = labelWidthPx - bodyPadXPx - codeColumnPx - bodyGapPx;
      } else {
        contentLeftPx = bodyPadXPx + codeColumnPx + bodyGapPx;
      }
    }

    const contentWidthPx = Math.max(contentRightPx - contentLeftPx, 1);
    const codeX = isCodeCentered
      ? centerX - (codeColumnPx / 2)
      : isCodeRight
        ? labelWidthPx - bodyPadXPx - codeColumnPx
        : bodyPadXPx;
    const codeCenterX = codeX + (codeColumnPx / 2);
    const codeY = centerY - ((barcodeHeightPx + mmToPx(metrics.codeTextFontMm) + codeTextMarginTopPx) / 2);

    const barcodeMarkup = label.codeType === "barcode"
      ? buildCode39SvgMarkup(label.codeValue, {
          height: 42,
          narrowWidth: 1.2,
          wideWidth: 3.2,
          quietZone: 8,
          showText: false,
        })
      : "";
    const barcodeImageHref = barcodeMarkup ? svgToDataUrl(barcodeMarkup) : "";
    const qrHref = qrSources[label.key] || "";

    const codeGroup = label.codeType === "code"
      ? `
          <image x="${codeCenterX - (qrSizePx / 2)}" y="${centerY - (qrSizePx / 2)}" width="${qrSizePx}" height="${qrSizePx}" href="${qrHref}" preserveAspectRatio="xMidYMid meet" />
          ${buildTextNode({
            text: label.codeValue,
            x: codeCenterX,
            y: centerY + (qrSizePx / 2) + codeTextMarginTopPx + mmToPx(metrics.codeTextFontMm),
            fontSizePx: mmToPx(metrics.codeTextFontMm),
            anchor: "middle",
            fill: "#374151",
          })}
        `
      : `
          <image x="${codeX}" y="${codeY}" width="${codeColumnPx}" height="${barcodeHeightPx}" href="${barcodeImageHref}" preserveAspectRatio="xMidYMid meet" />
          ${buildTextNode({
            text: label.codeValue,
            x: codeCenterX,
            y: codeY + barcodeHeightPx + codeTextMarginTopPx + mmToPx(metrics.codeTextFontMm),
            fontSizePx: mmToPx(metrics.codeTextFontMm),
            anchor: "middle",
            fill: "#374151",
          })}
        `;

    const productNamePositionEffective = getWarehouseEffectiveFieldPosition(productNamePosition, codePosition);
    const notePositionEffective = getWarehouseEffectiveFieldPosition(notePosition, codePosition);

    let textCursorY = contentTopPx + mmToPx(metrics.productNameFontMm);
    const contentNodes = [];

    if (showProductName) {
      contentNodes.push(buildTextNode({
        text: label.productName,
        x: getXForPosition(productNamePositionEffective, contentLeftPx, contentWidthPx),
        y: textCursorY,
        fontSizePx: mmToPx(metrics.productNameFontMm),
        anchor: getAnchor(productNamePositionEffective),
        uppercase: true,
      }));
      textCursorY += mmToPx(metrics.productNameFontMm) + fieldsMarginTopPx;
    }

    if (isCodeCentered) {
      const leftColumnLeft = bodyPadXPx;
      const leftColumnWidth = Math.max((labelWidthPx - (2 * bodyPadXPx) - codeColumnPx - (2 * bodyGapPx)) / 2, 1);
      const rightColumnLeft = leftColumnLeft + leftColumnWidth + bodyGapPx + codeColumnPx + bodyGapPx;
      const columnTopY = showProductName
        ? contentTopPx + mmToPx(metrics.productNameFontMm) + fieldsMarginTopPx
        : centerY - ((Math.max(leftFields.length, rightFields.length, 1) * (mmToPx(metrics.mrpFontMm || metrics.priceFontMm) + fieldRowGapPx)) / 2);

      leftFields.forEach((field, fieldIndex) => {
        const fieldPosition = getWarehouseEffectiveFieldPosition(
          getWarehouseLabelFieldPosition(customization, field.key),
          codePosition
        );
        const fontSizePx = mmToPx(getWarehouseLabelFieldFontMm(metrics, field.key));
        const y = columnTopY + (fieldIndex * (fontSizePx + fieldRowGapPx)) + fontSizePx;
        contentNodes.push(buildTextNode({
          text: `${field.label} ${field.value}`,
          x: getXForPosition(fieldPosition, leftColumnLeft, leftColumnWidth),
          y,
          fontSizePx,
          anchor: getAnchor(fieldPosition),
          fill: "#1f2937",
        }));
      });

      rightFields.forEach((field, fieldIndex) => {
        const fieldPosition = getWarehouseEffectiveFieldPosition(
          getWarehouseLabelFieldPosition(customization, field.key),
          codePosition
        );
        const fontSizePx = mmToPx(getWarehouseLabelFieldFontMm(metrics, field.key));
        const y = columnTopY + (fieldIndex * (fontSizePx + fieldRowGapPx)) + fontSizePx;
        contentNodes.push(buildTextNode({
          text: `${field.label} ${field.value}`,
          x: getXForPosition(fieldPosition, rightColumnLeft, leftColumnWidth),
          y,
          fontSizePx,
          anchor: getAnchor(fieldPosition),
          fill: "#1f2937",
        }));
      });
    } else {
      orderedVisibleFields.forEach((field) => {
        const fieldPosition = getWarehouseEffectiveFieldPosition(
          getWarehouseLabelFieldPosition(customization, field.key),
          codePosition
        );
        const fontSizePx = mmToPx(getWarehouseLabelFieldFontMm(metrics, field.key));
        contentNodes.push(buildTextNode({
          text: `${field.label} ${field.value}`,
          x: getXForPosition(fieldPosition, contentLeftPx, contentWidthPx),
          y: textCursorY,
          fontSizePx,
          anchor: getAnchor(fieldPosition),
          fill: "#1f2937",
        }));
        textCursorY += fontSizePx + fieldRowGapPx;
      });
    }

    if (showNote) {
      const noteY = contentBottomPx - noteMarginTopPx;
      contentNodes.push(buildTextNode({
        text: customization.note,
        x: getXForPosition(notePositionEffective, contentLeftPx, contentWidthPx),
        y: noteY,
        fontSizePx: mmToPx(metrics.noteFontMm),
        anchor: getAnchor(notePositionEffective),
        fill: "#374151",
      }));
    }

    const headerNode = showStoreNameHeader && metrics.topBandHeightMm > 0
      ? buildTextNode({
          text: storeName,
          x: getXForPosition(storeNamePosition, 0, labelWidthPx),
          y: Math.max(mmToPx(metrics.storeNameFontMm), topBandPx - mmToPx(0.8)),
          fontSizePx: mmToPx(metrics.storeNameFontMm),
          anchor: getAnchor(storeNamePosition),
          fill: "#111827",
          uppercase: true,
          letterSpacing: metrics.storeNameLetterSpacingEm ? `${metrics.storeNameLetterSpacingEm}em` : 0,
        })
      : "";

    return `
      <g transform="translate(${offsetX}, ${offsetY})">
        <rect x="0" y="0" width="${labelWidthPx}" height="${labelHeightPx}" rx="${mmToPx(3)}" ry="${mmToPx(3)}" fill="#ffffff" stroke="#d1d5db" stroke-width="${mmToPx(0.2)}" />
        ${headerNode}
        ${codeGroup}
        ${contentNodes.join("")}
      </g>
    `;
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidthPx}" height="${sheetHeightPx}" viewBox="0 0 ${sheetWidthPx} ${sheetHeightPx}">
      <rect x="0" y="0" width="${sheetWidthPx}" height="${sheetHeightPx}" fill="#ffffff" />
      ${labels.map((label, index) => buildLabelSvg(label, index)).join("")}
    </svg>
  `.trim();
};

const renderBarcodeSheetToPngDataUrl = async (markup) => {
  const widthPx = Math.max(1, Math.ceil(markup.sheetWidthMm * MM_TO_PX));
  const heightPx = Math.max(1, Math.ceil(markup.sheetHeightMm * MM_TO_PX));
  const svgMarkup = buildBarcodeSheetSvgMarkup(markup);
  const objectUrl = svgToDataUrl(svgMarkup);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to render barcode sticker sheet."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = widthPx * BARCODE_RENDER_SCALE;
    canvas.height = heightPx * BARCODE_RENDER_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas rendering is not available in this browser.");
    }
    ctx.scale(BARCODE_RENDER_SCALE, BARCODE_RENDER_SCALE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.drawImage(image, 0, 0, widthPx, heightPx);
    return canvas.toDataURL("image/png");
  } finally {
    // no-op for data URLs
  }
};

const buildEditForm = (item) => ({
  productId: item?.productId ? String(item.productId) : "",
  brandId: item?.brandId ? String(item.brandId) : "",
  size: item?.size && item.size !== "-" ? item.size : "",
  styleId: item?.styleId ? String(item.styleId) : "",
  designNo: item?.designNo && item.designNo !== "-" ? item.designNo : "",
  materialId: item?.materialId ? String(item.materialId) : "",
  patternId: item?.patternId ? String(item.patternId) : "",
  sleeveId: item?.sleeveId ? String(item.sleeveId) : "",
  fitId: item?.fitId ? String(item.fitId) : "",
  typeId: item?.typeId ? String(item.typeId) : "",
  colorId: item?.colorId ? String(item.colorId) : "",
  mrp: item?.mrp !== undefined && item?.mrp !== null ? String(item.mrp) : "",
  discountPerc: item?.discountPerc !== undefined && item?.discountPerc !== null ? String(item.discountPerc) : "0",
});

const mergeEditedItem = (item, form, options) => {
  const nextProductId = form.productId ? parseInt(form.productId, 10) : null;
  const nextBrandId = form.brandId ? parseInt(form.brandId, 10) : null;
  const nextStyleId = form.styleId ? parseInt(form.styleId, 10) : null;
  const nextMaterialId = form.materialId ? parseInt(form.materialId, 10) : null;
  const nextPatternId = form.patternId ? parseInt(form.patternId, 10) : null;
  const nextSleeveId = form.sleeveId ? parseInt(form.sleeveId, 10) : null;
  const nextFitId = form.fitId ? parseInt(form.fitId, 10) : null;
  const nextTypeId = form.typeId ? parseInt(form.typeId, 10) : null;
  const nextColorId = form.colorId ? parseInt(form.colorId, 10) : null;
  const nextMrp = toNumber(form.mrp, 0);
  const nextDiscountPerc = toNumber(form.discountPerc, 0);

  return {
    ...item,
    productId: nextProductId,
    productName: nextProductId ? findOptionLabel(options.products, nextProductId, item.productName) : "-",
    brandId: nextBrandId,
    brandName: nextBrandId ? findOptionLabel(options.brands, nextBrandId, item.brandName) : "-",
    size: toDisplayText(form.size),
    styleId: nextStyleId,
    styleName: nextStyleId ? findOptionLabel(options.styles, nextStyleId, item.styleName) : "-",
    designNo: toDisplayText(form.designNo),
    materialId: nextMaterialId,
    materialName: nextMaterialId ? findOptionLabel(options.materials, nextMaterialId, item.materialName) : "-",
    patternId: nextPatternId,
    patternName: nextPatternId ? findOptionLabel(options.patterns, nextPatternId, item.patternName) : "-",
    sleeveId: nextSleeveId,
    sleeveName: nextSleeveId ? findOptionLabel(options.sleeves, nextSleeveId, item.sleeveName) : "-",
    fitId: nextFitId,
    fitName: nextFitId ? findOptionLabel(options.fits, nextFitId, item.fitName) : "-",
    typeId: nextTypeId,
    typeName: nextTypeId ? findOptionLabel(options.types, nextTypeId, item.typeName) : "-",
    colorId: nextColorId,
    colorName: nextColorId ? findOptionLabel(options.colors, nextColorId, item.colorName) : "-",
    mrp: nextMrp,
    discountPerc: nextDiscountPerc,
    finalPrice: calcFinalPrice(nextMrp, nextDiscountPerc),
  };
};

const toOptions = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    value: String(row.id),
    label: row.name || row.label || `#${row.id}`,
  }));

const createDefaultItemFilters = () => ({
  productName: "",
  barcode: "",
  size: "",
  designNo: "",
  qty: "",
  cost: "",
  marginPerc: "",
  sellingPrice: "",
  mrp: "",
  discountPerc: "",
  finalPrice: "",
  status: "",
});

const hasGeneratedDirectPurchaseBarcodes = (entry) => {
  const items = Array.isArray(entry?.items) ? entry.items : [];
  return items.some((item) => {
    if (
      item?.barcode_id
      || item?.barcodeId
      || item?.barcodeRef?.barcode
      || item?.barcodeRef?.name
      || item?.barcodeRef?.inventory_item_id
      || item?.barcodeRef?.inventoryItemId
    ) {
      return true;
    }
    const jumpDetails = Array.isArray(item?.jump_details) ? item.jump_details : [];
    return jumpDetails.some((detail) =>
      detail?.generatedBarcodeId
      || detail?.generated_barcode_id
      || detail?.generatedInventoryItemId
      || detail?.generated_inventory_item_id
    );
  });
};

const StickerFieldsBlock = ({ fields, metrics, textStyle, customization }) => {
  if (fields.length === 0) return null;
  const codePosition = getWarehouseCodePosition(customization);

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
          getWarehouseLabelFieldPosition(customization, field.key),
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

const StickerCard = ({ label, customization, storeName, qrSrc = "" }) => {
  const showStoreName = isWarehouseLabelFieldVisible(customization, "storeName") && storeName;
  const showProductName = isWarehouseLabelFieldVisible(customization, "productName");
  const showNote = isWarehouseLabelFieldVisible(customization, "note") && customization.note;
  const storeNamePosition = getWarehouseLabelFieldPosition(customization, "storeName");
  const productNamePosition = getWarehouseLabelFieldPosition(customization, "productName");
  const notePosition = getWarehouseLabelFieldPosition(customization, "note");
  const metrics = getWarehouseStickerMetrics(customization);
  const textStyle = metrics.textStyle;
  const codePosition = getWarehouseCodePosition(customization);
  const isCodeRight = codePosition === "right";
  const isCodeCentered = codePosition === "center";
  const visibleFields = (Array.isArray(label.fields) ? label.fields : []).filter((field) => {
    if (field.key === "mrp") return isWarehouseLabelFieldVisible(customization, "mrp");
    if (field.key === "discount") return isWarehouseLabelFieldVisible(customization, "discount");
    if (field.key === "rs") return isWarehouseLabelFieldVisible(customization, "rs");
    return true;
  });
  const orderedVisibleFields = getWarehouseOrderedFields(customization, visibleFields);
  const { leftFields, rightFields } = splitWarehouseLabelFieldsForCenter(customization, orderedVisibleFields);
  const barcodeMarkup = label.codeType === "barcode"
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
      {label.codeType === "code" ? (
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
        {label.note}
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
        customization={customization}
      />
      {noteContent}
    </div>
  );

  return (
    <div
      className="overflow-hidden rounded-[3mm] border border-gray-300 bg-white"
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
                  customization={customization}
                />
              </div>
              {codeContent}
              <div className="min-w-0 overflow-hidden">
                <StickerFieldsBlock
                  fields={rightFields}
                  metrics={metrics}
                  textStyle={textStyle}
                  customization={customization}
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

const BarcodePreviewModal = ({
  open,
  title,
  labels,
  customization,
  storeName,
  qrSources,
  qrLoading,
  onClose,
  onPrint,
}) => {
  if (!open) return null;

  const metrics = getWarehouseStickerMetrics(customization);
  const sheetWidthMm = metrics.labelWidthMm * metrics.labelsPerRow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
      <div className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Barcode Preview</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              disabled={labels.length === 0 || qrLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-gray-900/40 p-5">
          {labels.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No generated barcodes available for preview.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid bg-white"
                style={{
                  width: `${sheetWidthMm}mm`,
                  gridTemplateColumns: `repeat(${metrics.labelsPerRow}, ${metrics.labelWidthMm}mm)`,
                  columnGap: "0mm",
                  rowGap: "1mm",
                }}
              >
                {labels.map((label) => (
                  <StickerCard
                    key={label.key}
                    label={label}
                    customization={customization}
                    storeName={storeName}
                    qrSrc={qrSources[label.key] || ""}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BarcodeGeneration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authUser = useSelector((state) => state.auth.user);
  const { connected: printerConnected, printHtml: queuePrintHtml } = usePrintContext();
  const transportEntryId = searchParams.get("transport_entry_id");
  const directPurchaseId = searchParams.get("direct_purchase_id");
  const isDirectPurchaseFlow = !!directPurchaseId;

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingRow, setUpdatingRow] = useState(false);

  const [summary, setSummary] = useState({
    supplier: "",
    company: "",
    totalPieces: 0,
    invoiceNo: "",
    lrNo: "",
  });

  const [allItems, setAllItems] = useState([]);
  const [checked, setChecked] = useState({});
  const [generatedIds, setGeneratedIds] = useState(new Set());
  const [barcodeMap, setBarcodeMap] = useState({});
  const [barcodeRows, setBarcodeRows] = useState([]);
  const [transportCompanyId, setTransportCompanyId] = useState(null);
  const [editorOptions, setEditorOptions] = useState(EMPTY_EDITOR_OPTIONS);
  const [activeEditorId, setActiveEditorId] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [itemFilterDraft, setItemFilterDraft] = useState(createDefaultItemFilters);
  const [itemFilters, setItemFilters] = useState(createDefaultItemFilters);
  const [labelCustomization, setLabelCustomization] = useState(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLabels, setPreviewLabels] = useState([]);
  const [qrSources, setQrSources] = useState({});
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const targetCompany = transportCompanyId || authUser?.company_id || "default";
    fetchWarehouseBarcodeCustomization(api, targetCompany).then((config) => {
      if (!cancelled) {
        setLabelCustomization(config);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [transportCompanyId, authUser?.company_id]);

  useEffect(() => {
    let cancelled = false;

    const loadEditorOptions = async () => {
      try {
        const [
          productsRes,
          brandsRes,
          stylesRes,
          materialsRes,
          patternsRes,
          sleevesRes,
          fitsRes,
          typesRes,
          colorsRes,
        ] = await Promise.all([
          api.get("/products", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
          api.get("/brands", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
          api.get("/attributes/style").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/material").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/pattern").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/sleeve").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/fit").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/type").catch(() => ({ data: { data: [] } })),
          api.get("/attributes/colour").catch(() => ({ data: { data: [] } })),
        ]);

        if (cancelled) return;

        setEditorOptions({
          products: toOptions(productsRes.data?.data),
          brands: toOptions(brandsRes.data?.data),
          styles: toOptions(stylesRes.data?.data),
          materials: toOptions(materialsRes.data?.data),
          patterns: toOptions(patternsRes.data?.data),
          sleeves: toOptions(sleevesRes.data?.data),
          fits: toOptions(fitsRes.data?.data),
          types: toOptions(typesRes.data?.data),
          colors: toOptions(colorsRes.data?.data),
        });
      } catch (err) {
        console.error("Failed to load barcode editor options:", err);
      }
    };

    loadEditorOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeEditorId) return;
    const activeItem = allItems.find((item) => item.sourceItemId === activeEditorId);
    if (activeItem) {
      setEditForm(buildEditForm(activeItem));
      return;
    }
    setActiveEditorId(null);
    setEditForm(buildEditForm(null));
  }, [allItems, activeEditorId]);

  useEffect(() => {
    if (!transportEntryId && !directPurchaseId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        if (directPurchaseId) {
          setTransportCompanyId(null);
          const dpRes = await api.get(`/direct-purchases/${directPurchaseId}`);
          const entry = dpRes.data?.data;
          const items = Array.isArray(entry?.items) ? entry.items : [];
          const workflowStatus = String(entry?.invoice_workflow_status || "").trim().toLowerCase();
          const hasExistingBarcodes = hasGeneratedDirectPurchaseBarcodes(entry);
          const shouldLoadSavedBarcodes =
            workflowStatus === "invoice_progress"
            || workflowStatus === "invoice_completed"
            || hasExistingBarcodes;
          const barcodeRows = shouldLoadSavedBarcodes
            ? (await api.get(`/barcodes?direct_purchase_id=${directPurchaseId}`).catch(() => ({ data: { data: [] } }))).data?.data || []
            : [];
          setBarcodeRows(barcodeRows);

          setSummary({
            supplier: entry?.supplier?.name || "-",
            company: entry?.company?.name || "-",
            totalPieces: items.reduce((sum, item) => sum + (parseInt(item?.qty, 10) || 0), 0),
            invoiceNo: entry?.invoice_no || "-",
            lrNo: entry?.lr_no || "-",
          });

          const flatItems = items.flatMap((item) => {
            const jumpDetails = Array.isArray(item?.jump_details) ? item.jump_details : [];
            if (jumpDetails.length > 0) {
              return jumpDetails.map((detail, index) => {
                const mrp = parseFloat(detail?.mrp ?? detail?.sellingPrice ?? detail?.selling_price) || 0;
                const discountPerc = parseFloat(detail?.saleDiscountPerc ?? detail?.sale_discount_perc) || 0;
                const finalPrice = parseFloat(detail?.final ?? detail?.finalPrice) || calcFinalPrice(mrp, discountPerc);
                return {
                  id: `${item.id}:${index}`,
                  sourceItemId: `${item.id}:${index}`,
                  directPurchaseItemId: item.id,
                  jumpDetailIndex: index,
                  productId: parseInt(detail?.productId ?? item?.product_id, 10) || item?.product?.id || null,
                  productName: item?.product?.name || "-",
                  brandId: parseInt(detail?.brandId ?? item?.brand_id, 10) || item?.brand?.id || null,
                  brandName: item?.brand?.name || "-",
                  size: detail?.size || item?.size || "-",
                  styleId: parseInt(detail?.styleId, 10) || null,
                  styleName: detail?.styleName || "-",
                  designNo: detail?.designNo || detail?.design_no || item?.design_no || "-",
                  materialId: parseInt(detail?.materialId, 10) || null,
                  materialName: detail?.materialName || "-",
                  patternId: parseInt(detail?.patternId, 10) || null,
                  patternName: detail?.patternName || "-",
                  sleeveId: parseInt(detail?.sleeveId, 10) || null,
                  sleeveName: detail?.sleeveName || "-",
                  fitId: parseInt(detail?.fitId, 10) || null,
                  fitName: detail?.fitName || "-",
                  typeId: parseInt(detail?.typeId, 10) || null,
                  typeName: detail?.typeName || "-",
                  colorId: parseInt(detail?.colorId ?? item?.color_id, 10) || item?.color_id || null,
                  colorName: detail?.colorName || "-",
                  qty: parseInt(detail?.qty, 10) || 0,
                  cost: parseFloat(detail?.cost ?? item?.cost) || 0,
                  marginPerc: parseFloat(detail?.marginPerc ?? detail?.margin_perc) || 0,
                  sellingPrice: mrp,
                  mrp,
                  discountPerc,
                  finalPrice,
                  generatedBarcode: "",
                  primaryInventoryItemId:
                    Number((detail?.generatedInventoryItemId ?? detail?.generated_inventory_item_id) || 0) || null,
                };
              });
            }

            const sellingPrice = parseFloat(item?.price) || 0;
            return [{
              id: item.id,
              sourceItemId: item.id,
              directPurchaseItemId: item.id,
              productId: item?.product?.id || item?.product_id || null,
              productName: item?.product?.name || "-",
              brandId: item?.brand?.id || item?.brand_id || null,
              brandName: item?.brand?.name || "-",
              size: item?.size || "-",
              styleId: null,
              styleName: "-",
              designNo: item?.design_no || "-",
              materialId: null,
              materialName: "-",
              patternId: null,
              patternName: "-",
              sleeveId: null,
              sleeveName: "-",
              fitId: null,
              fitName: "-",
              typeId: null,
              typeName: "-",
              colorId: item?.color_id || null,
              colorName: "-",
              qty: parseInt(item?.qty, 10) || 0,
              cost: parseFloat(item?.cost) || 0,
              marginPerc: parseFloat(item?.margin_perc) || 0,
              sellingPrice,
              mrp: sellingPrice,
              discountPerc: 0,
              finalPrice: sellingPrice,
              generatedBarcode: "",
              primaryInventoryItemId:
                Number(item?.barcodeRef?.inventory_item_id ?? item?.barcodeRef?.inventoryItemId ?? 0) || null,
            }];
          });

          setAllItems(flatItems);

          const initialChecked = {};
          flatItems.forEach((item) => {
            initialChecked[item.sourceItemId] = false;
          });
          setChecked(initialChecked);

          const assignedRanges = assignDirectPurchaseBarcodeRanges(flatItems, barcodeRows);
          const genIds = new Set();
          const bcMap = {};
          flatItems.forEach((item) => {
            let barcodeText = assignedRanges.get(item.sourceItemId) || item.generatedBarcode || "";
            if (!barcodeText) {
              const linkedItem = items.find((row) => String(row.id) === String(item.directPurchaseItemId));
              const linkedBarcodeId = linkedItem?.barcode_id ?? linkedItem?.barcodeId;
              if (linkedItem?.barcodeRef?.name) {
                barcodeText = linkedItem.barcodeRef.name;
              } else if (linkedBarcodeId) {
                const linkedRow = barcodeRows.find((row) => Number(row.id) === Number(linkedBarcodeId));
                barcodeText = linkedRow?.barcode || "";
              }
            }
            if (!barcodeText) return;
            const sourceKey = String(item.sourceItemId);
            genIds.add(sourceKey);
            bcMap[sourceKey] = barcodeText;
          });
          setGeneratedIds(genIds);
          setBarcodeMap(bcMap);
        } else {
          const teRes = await api.get(`/transport-entries/${transportEntryId}`);
          const te = teRes.data.data;

          const invRes = await api.get(`/invoices?transport_entry_id=${transportEntryId}`);
          const invoices = invRes.data.data || [];
          const inv = invoices[0];

          setSummary({
            supplier: te?.supplier?.name || "-",
            company: te?.company?.name || "-",
            totalPieces: inv?.pieces || 0,
            invoiceNo: inv?.invoice_no || "-",
            lrNo: te?.lr_no || "-",
          });
          setTransportCompanyId(
            Number(te?.company?.id || te?.company_id || 0) || null
          );

          const ieRes = await api.get(`/inventory-entries?transport_entry_id=${transportEntryId}`);
          const entries = ieRes.data.data || [];
          const detailedEntries = await Promise.all(
            entries.map((entry) =>
              api.get(`/inventory-entries/${entry.id}`)
                .then((res) => res.data?.data || entry)
                .catch(() => entry)
            )
          );

          const flatItems = [];
          detailedEntries.forEach((entry) => {
            const productName = entry?.product?.name || "-";
            const sellingMode = entry?.product?.selling_mode || "Piece";
            const inventoryItems = entry?.items || [];
            inventoryItems.forEach((item) => {
              flatItems.push({
                id: item.id,
                sourceItemId: item.id,
                inventoryEntryId: entry.id,
                inventoryItemId: item.id,
                productId: entry?.product?.id || null,
                productName,
                sellingMode,
                brandId: entry?.brand?.id || null,
                brandName: entry?.brand?.name || "-",
                size: item.size || "-",
                styleId: entry?.style?.id || null,
                styleName: entry?.style?.name || "-",
                designNo: item.design_no || "-",
                materialId: entry?.material?.id || null,
                materialName: entry?.material?.name || "-",
                patternId: entry?.pattern?.id || null,
                patternName: entry?.pattern?.name || "-",
                sleeveId: entry?.sleeve?.id || null,
                sleeveName: entry?.sleeve?.name || "-",
                fitId: entry?.fit?.id || null,
                fitName: entry?.fit?.name || "-",
                typeId: entry?.type?.id || null,
                typeName: entry?.type?.name || "-",
                colorId: entry?.color?.id || null,
                colorName: entry?.color?.name || "-",
                qty: parseInt(item.qty, 10) || 0,
                cost: parseFloat(item.cost) || 0,
                marginPerc: parseFloat(item.margin_perc) || 0,
                sellingPrice: parseFloat(item.selling_price) || parseFloat(item.price) || 0,
                mrp: parseFloat(item.mrp) || 0,
                discountPerc: parseFloat(item.discount_perc) || 0,
                finalPrice: parseFloat(item.final_price) || 0,
              });
            });
          });

          setAllItems(flatItems);

          const initialChecked = {};
          flatItems.forEach((item) => {
            initialChecked[item.sourceItemId] = false;
          });
          setChecked(initialChecked);

          const bcRes = await api.get(`/barcodes?transport_entry_id=${transportEntryId}`);
          const barcodes = bcRes.data.data || [];
          setBarcodeRows(barcodes);
          const barcodeRangesByInventoryItemId = buildBarcodeRangeMap(
            barcodes,
            (barcodeRow) => Number(barcodeRow?.inventory_item_id || 0) || null
          );
          const barcodeRangesByVariantKey = buildBarcodeRangeMap(barcodes, getBarcodeRowVariantKey);

          const genIds = new Set();
          const bcMap = {};
          flatItems.forEach((item) => {
            const barcodeText =
              barcodeRangesByInventoryItemId.get(item.inventoryItemId)
              || barcodeRangesByVariantKey.get(getItemVariantKey(item))
              || "";
            if (barcodeText) {
              const key = sourceItemKey(item.sourceItemId);
              genIds.add(key);
              bcMap[key] = barcodeText;
            }
          });
          setGeneratedIds(genIds);
          setBarcodeMap(bcMap);
        }
      } catch (err) {
        console.error("Failed to load barcode data:", err);
        showToast("error", "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportEntryId, directPurchaseId, isDirectPurchaseFlow]);

  const columns = [
    { label: "", w: 40, align: "center" },
    { label: "S.No", w: 45, align: "center" },
    { label: "Product", w: 140, align: "left" },
    { label: "Barcode", w: 170, align: "center" },
    { label: "Size", w: 60, align: "center" },
    { label: "Design", w: 75, align: "center" },
    { label: "Qty", w: 50, align: "right" },
    { label: "Cost", w: 80, align: "right" },
    { label: "Mrgn%", w: 60, align: "right" },
    { label: "Sale", w: 80, align: "right" },
    { label: "MRP", w: 80, align: "right" },
    { label: "Dis%", w: 55, align: "right" },
    { label: "Final", w: 80, align: "right" },
    { label: "Status", w: 75, align: "center" },
  ];
  const { widths: colWidths, onMouseDown: onColResize } = useResizableColumns(columns.map((c) => c.w));

  const activeItem = allItems.find((item) => item.sourceItemId === activeEditorId) || null;
  const storeName = useMemo(
    () =>
      String(authUser?.company_name || "").trim()
      || String(summary.company || "").trim()
      || "Store",
    [authUser?.company_name, summary.company]
  );
  const barcodeValuesMap = useMemo(
    () =>
      isDirectPurchaseFlow
        ? assignDirectPurchaseBarcodeValueMap(allItems, barcodeRows)
        : buildTransportBarcodeValueMap(allItems, barcodeRows),
    [allItems, barcodeRows, isDirectPurchaseFlow]
  );
  const previewItems = useMemo(() => {
    const checkedWithBarcodes = allItems.filter(
      (item) => checked[item.sourceItemId] && isGeneratedItem(generatedIds, item.sourceItemId)
    );
    if (checkedWithBarcodes.length > 0) return checkedWithBarcodes;

    const generatedItems = allItems.filter((item) => isGeneratedItem(generatedIds, item.sourceItemId));
    if (generatedItems.length > 0) return generatedItems;

    if (activeItem && isGeneratedItem(generatedIds, activeItem.sourceItemId)) return [activeItem];
    return [];
  }, [allItems, checked, generatedIds, activeItem]);
  const canPreviewBarcodes = previewItems.length > 0;
  const previewTitle = useMemo(() => {
    if (previewItems.length === 1) {
      return `${previewItems[0].productName} Sticker Preview`;
    }
    if (previewItems.length > 1) {
      return `${previewItems.length} Items Sticker Preview`;
    }
    return "Barcode Sticker Preview";
  }, [previewItems]);
  const filteredItems = allItems.filter((item) => {
    const activeFilters = Object.entries(itemFilters).filter(([, value]) => String(value || "").trim() !== "");
    if (activeFilters.length === 0) return true;

    const searchRow = {
      productName: item.productName,
      barcode: barcodeForItem(barcodeMap, item.sourceItemId),
      size: item.size,
      designNo: item.designNo,
      qty: item.qty,
      cost: item.cost.toFixed(2),
      marginPerc: item.marginPerc,
      sellingPrice: item.sellingPrice.toFixed(2),
      mrp: item.mrp.toFixed(2),
      discountPerc: item.discountPerc,
      finalPrice: item.finalPrice.toFixed(2),
      status: isGeneratedItem(generatedIds, item.sourceItemId) ? "Done" : "Pending",
    };

    return activeFilters.every(([key, value]) =>
      String(searchRow[key] ?? "").toLowerCase().includes(String(value).trim().toLowerCase())
    );
  });
  const selectableFilteredItems = filteredItems.filter((item) => !isGeneratedItem(generatedIds, item.sourceItemId));
  const allChecked = selectableFilteredItems.length > 0
    && selectableFilteredItems.every((item) => checked[item.sourceItemId]);
  const selectedItems = allItems.filter(
    (item) => checked[item.sourceItemId] && !isGeneratedItem(generatedIds, item.sourceItemId)
  );
  const selectedPieces = selectedItems.reduce((sum, item) => sum + item.qty, 0);
  const allItemsHaveBarcodes = allItems.length > 0
    && allItems.every((item) => Boolean(barcodeForItem(barcodeMap, item.sourceItemId)));

  useEffect(() => {
    if (!previewOpen || previewItems.length === 0) {
      setPreviewLabels([]);
      return;
    }
    setPreviewLabels(
      previewItems.flatMap((item) =>
        buildStickerLabels({
          item,
          barcodeRows: getItemBarcodeRows(item, barcodeValuesMap, barcodeMap),
          customization: labelCustomization,
        })
      )
    );
  }, [previewOpen, previewItems, barcodeValuesMap, barcodeMap, labelCustomization]);

  useEffect(() => {
    const qrLabels = previewLabels.filter((label) => label.codeType === "code");
    if (!previewOpen || qrLabels.length === 0) {
      setQrSources({});
      setQrLoading(false);
      return;
    }

    let cancelled = false;
    const buildQrSources = async () => {
      setQrLoading(true);
      try {
        const entries = await Promise.all(
          qrLabels.map(async (label) => [
            label.key,
            await QRCode.toDataURL(label.codeValue, {
              margin: 1,
              width: 180,
              errorCorrectionLevel: "M",
            }),
          ])
        );
        if (cancelled) return;
        setQrSources(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to build QR preview:", err);
          showToast("error", "Failed to build QR preview");
        }
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    };

    buildQrSources();
    return () => {
      cancelled = true;
    };
  }, [previewOpen, previewLabels]);

  const handleToggle = (item) => {
    if (isGeneratedItem(generatedIds, item.sourceItemId)) return;
    setChecked((prev) => ({ ...prev, [item.sourceItemId]: !prev[item.sourceItemId] }));
    setActiveEditorId(item.sourceItemId);
    setEditForm(buildEditForm(item));
  };

  const handleRowClick = (item) => {
    setChecked((prev) => ({ ...prev, [item.sourceItemId]: !prev[item.sourceItemId] }));
    setActiveEditorId(item.sourceItemId);
    setEditForm(buildEditForm(item));
  };

  const handleToggleAll = () => {
    const newChecked = {};
    selectableFilteredItems.forEach((item) => {
      newChecked[item.sourceItemId] = !allChecked;
    });
    setChecked((prev) => ({ ...prev, ...newChecked }));
  };

  const handleEditorChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemFilterDraftChange = (key, value) => {
    setItemFilterDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleItemFilterKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setItemFilters({ ...itemFilterDraft });
  };
  const handleRowUpdate = async () => {
    if (!activeItem) {
      showToast("warning", "Select a row to update");
      return;
    }

    setUpdatingRow(true);
    try {
      await api.put("/barcodes/source-item", {
        inventoryEntryId: activeItem.inventoryEntryId,
        inventoryItemId: activeItem.inventoryItemId,
        directPurchaseItemId: activeItem.directPurchaseItemId,
        jumpDetailIndex: activeItem.jumpDetailIndex,
        productId: editForm.productId || null,
        brandId: editForm.brandId || null,
        size: editForm.size,
        styleId: editForm.styleId || null,
        designNo: editForm.designNo,
        materialId: editForm.materialId || null,
        patternId: editForm.patternId || null,
        sleeveId: editForm.sleeveId || null,
        fitId: editForm.fitId || null,
        typeId: editForm.typeId || null,
        colorId: editForm.colorId || null,
        mrp: editForm.mrp,
        discountPerc: editForm.discountPerc,
      });

      const updatedItem = mergeEditedItem(activeItem, editForm, editorOptions);
      setAllItems((prev) =>
        prev.map((item) => (item.sourceItemId === activeItem.sourceItemId ? updatedItem : item))
      );
      setEditForm(buildEditForm(updatedItem));
      showToast("success", "Row updated successfully");
    } catch (err) {
      console.error("Failed to update barcode row:", err);
      showToast("error", err.response?.data?.message || "Failed to update row");
    } finally {
      setUpdatingRow(false);
    }
  };

  const handleGenerate = async () => {
    if (!transportEntryId && !directPurchaseId) {
      showToast("error", "No barcode source linked. Open this page from the workflow.");
      return;
    }
    if (selectedItems.length === 0 && allItemsHaveBarcodes) {
      showToast("success", "Barcode Generated");
      return;
    }
    if (selectedItems.length === 0) {
      showToast("warning", "Select items to generate barcodes first.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/barcodes/generate", {
        ...(transportEntryId ? { transportEntryId } : {}),
        ...(directPurchaseId ? { directPurchaseId } : {}),
        ...(transportEntryId && transportCompanyId ? { companyId: transportCompanyId } : {}),
        codeType: labelCustomization.codeType,
        items: selectedItems.map((item) => ({
          sourceItemId: item.sourceItemId,
          directPurchaseItemId: item.directPurchaseItemId,
          jumpDetailIndex: item.jumpDetailIndex,
          inventoryEntryId: item.inventoryEntryId,
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          brandId: item.brandId,
          styleId: item.styleId,
          designNo: item.designNo,
          materialId: item.materialId,
          patternId: item.patternId,
          sleeveId: item.sleeveId,
          fitId: item.fitId,
          typeId: item.typeId,
          colorId: item.colorId,
          productName: item.productName,
          size: item.size,
          qty: item.qty,
          cost: item.cost,
          marginPerc: item.marginPerc,
          sellingPrice: item.sellingPrice,
          mrp: item.mrp,
          discountPerc: item.discountPerc,
          finalPrice: item.finalPrice,
        })),
      });

      const data = res.data.data;
      showToast("success", res.data.message);

      const newGenIds = new Set([...generatedIds].map((id) => String(id)));
      const newBcMap = { ...barcodeMap };
      const processedRows = [...(data.created || []), ...(data.skipped || [])];
      const nextBarcodeRows = [...barcodeRows, ...processedRows].filter((row, index, array) => {
        const rowId = row?.id ?? null;
        const rowBarcode = String(row?.barcode || "").trim();
        return array.findIndex((candidate) =>
          (rowId !== null && candidate?.id === rowId)
          || (!rowId && String(candidate?.barcode || "").trim() === rowBarcode)
        ) === index;
      });
      const createdRanges = buildBarcodeRangeMap(
        processedRows,
        (bc) => bc?.sourceItemId ?? bc?.inventory_item_id ?? bc?.inventoryItemId ?? null
      );
      createdRanges.forEach((barcodeRange, sourceItemId) => {
        newGenIds.add(String(sourceItemId));
        if (barcodeRange) newBcMap[String(sourceItemId)] = barcodeRange;
      });
      processedRows.forEach((row) => {
        const sourceItemId = row?.sourceItemId;
        if (sourceItemId === undefined || sourceItemId === null) return;
        const key = String(sourceItemId);
        const barcodeText = String(row?.barcode || "").trim();
        if (!barcodeText) return;
        newGenIds.add(key);
        newBcMap[key] = newBcMap[key] || barcodeText;
      });
      setGeneratedIds(newGenIds);
      setBarcodeMap(newBcMap);
      setBarcodeRows(nextBarcodeRows);
      setChecked((prev) => {
        const next = { ...prev };
        selectedItems.forEach((item) => {
          next[item.sourceItemId] = true;
        });
        return next;
      });
    } catch (err) {
      console.error("Generate failed:", err);
      showToast("error", err.response?.data?.message || "Failed to generate barcodes");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!transportEntryId && !directPurchaseId) {
      showToast("error", "No barcode source linked. Open this page from the workflow.");
      return;
    }

    if (!allItemsHaveBarcodes) {
      showToast("warning", "Generate barcode first, then save.");
      return;
    }

    setSaving(true);
    try {
      if (directPurchaseId) {
        await api.put(`/direct-purchases/${directPurchaseId}`, {
          invoiceWorkflowStatus: "invoice_progress",
        });
      } else {
        await api.put(`/transport-entries/${transportEntryId}`, {
          status: "barcode_generated",
        });
      }
      showToast("success", "Saved");
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", err.response?.data?.message || "Failed to save barcode status");
    } finally {
      setSaving(false);
    }
  };

  const openPreview = () => {
    if (!canPreviewBarcodes) return;
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const handlePrintPreview = async () => {
    if (previewLabels.length === 0 || qrLoading) return;
    const sheetMarkup = buildBarcodeSheetMarkup({
      labels: previewLabels,
      customization: labelCustomization,
      storeName,
      qrSources,
    });

    if (printerConnected) {
      try {
        const imageDataUrl = await renderBarcodeSheetToPngDataUrl(sheetMarkup);
        const jobId = await queuePrintHtml("", {
          label: {
            kind: "rendered_sheet_v1",
            jobName: previewItems.length === 1
              ? `${previewItems[0].productName} barcode`
              : previewItems.length > 1
                ? `${previewItems.length} warehouse barcodes`
                : "Warehouse barcode",
            imageDataUrl,
            pageWidthMm: sheetMarkup.sheetWidthMm,
            pageHeightMm: sheetMarkup.sheetHeightMm,
          },
          docType: "generic",
          printerFunction: "barcode",
          printerConfig: {
            printer_type: "label",
          },
        });

        if (jobId) {
          showToast(
            "success",
            "Barcode sticker sheet sent to the local printer connector."
          );
          return;
        }
      } catch (err) {
        console.error("Local barcode print failed:", err);
        showToast("error", err?.message || "Failed to send barcode stickers to the local printer.");
        return;
      }
    }

    const previewWindow = window.open("", "_blank", "width=1100,height=800");
    if (!previewWindow) {
      showToast("error", "Popup blocked. Allow popups to print barcode stickers.");
      return;
    }

    previewWindow.document.write(buildBarcodeSheetDocumentHtml(sheetMarkup, { autoPrint: true }));
    previewWindow.document.close();
  };

  if (loading) {
    return <PageSkeleton variant="table" rows={8} cols={10} />;
  }

  const renderSelectField = (label, field, options) => (
    <div>
      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <select
        value={editForm[field] || ""}
        onChange={(e) => handleEditorChange(field, e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderInputField = (label, field, type = "text") => (
    <div>
      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={editForm[field] || ""}
        onChange={(e) => handleEditorChange(field, e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Barcode Generation</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate("/warehouse/customisation")}
            className="glass-btn flex items-center"
          >
            Customisation
          </button>
          <button
            onClick={openPreview}
            disabled={!canPreviewBarcodes || qrLoading}
            className="glass-btn glass-btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4 mr-1" /> Preview Barcode
          </button>
          <button
            onClick={handleSave}
            disabled={saving || allItems.length === 0}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </button>
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          >
            {saving ? "Generating..." : "Generate Barcodes"}
          </button>
          <button
            onClick={() => navigate("/warehouse/barcode/search")}
            className="glass-btn glass-btn-primary flex items-center"
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4 flex gap-4">
        <div className="w-[300px] min-h-0 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 h-full overflow-y-auto p-4 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Supplier</div>
                <div className="text-right text-sm font-bold text-blue-700 dark:text-blue-400 truncate">{summary.supplier}</div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Company</div>
                <div className="text-right text-sm font-bold text-blue-700 dark:text-blue-400 truncate">{summary.company}</div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Pieces</div>
                <div className="text-right text-sm font-bold text-red-600 dark:text-red-400">
                  {selectedPieces} / {summary.totalPieces || allItems.reduce((sum, item) => sum + item.qty, 0)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice No</div>
                <div className="text-right text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{summary.invoiceNo}</div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">LR No</div>
                <div className="text-right text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{summary.lrNo}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Barcode Status</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                  {generatedIds.size} Generated
                </span>
                <span className="inline-block px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
                  {allItems.length - generatedIds.size} Pending
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={saving || (selectedItems.length === 0 && !allItemsHaveBarcodes)}
              className="glass-btn glass-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Generating..." : `Generate Barcodes (${selectedItems.length})`}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || allItems.length === 0}
              className="glass-btn glass-btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 inline mr-1" /> Save
            </button>

            <button
              onClick={openPreview}
              disabled={!canPreviewBarcodes || qrLoading}
              className="glass-btn glass-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4 inline mr-1" /> Preview Barcode
            </button>

            {activeItem ? (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Row Editor</div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{activeItem.productName}</div>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Row #{allItems.findIndex((item) => item.sourceItemId === activeItem.sourceItemId) + 1}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {renderSelectField("Product", "productId", editorOptions.products)}
                  {renderSelectField("Brand Name", "brandId", editorOptions.brands)}
                  {renderInputField("Size", "size")}
                  {renderSelectField("Style", "styleId", editorOptions.styles)}
                  {renderInputField("Design", "designNo")}
                  {renderSelectField("Material", "materialId", editorOptions.materials)}
                  {renderSelectField("Pattern", "patternId", editorOptions.patterns)}
                  {renderSelectField("Sleeve", "sleeveId", editorOptions.sleeves)}
                  {renderSelectField("Fit", "fitId", editorOptions.fits)}
                  {renderSelectField("Type", "typeId", editorOptions.types)}
                  {renderSelectField("Color", "colorId", editorOptions.colors)}
                  {renderInputField("MRP", "mrp", "number")}
                  {renderInputField("Discount", "discountPerc", "number")}
                  <div className="flex items-end text-[10px] text-gray-500 dark:text-gray-400">
                    Final: {calcFinalPrice(editForm.mrp, editForm.discountPerc).toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={handleRowUpdate}
                  disabled={updatingRow}
                  className="glass-btn glass-btn-primary w-full mt-4 disabled:opacity-50"
                >
                  {updatingRow ? "Updating..." : "Update"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-w-0 min-h-0">
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="w-full border-collapse text-xs" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((s, w) => s + w, 0) }}>
                <colgroup>
                  {colWidths.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead className="bg-blue-50 dark:bg-blue-900/30 text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide sticky top-0 z-10">
                  <tr>
                    {columns.map((col, i) => (
                      <th
                        key={i}
                        className="relative border-r border-b border-gray-300 dark:border-gray-700 p-2 select-none"
                        style={{ textAlign: col.align }}
                      >
                        {i === 0 ? (
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={handleToggleAll}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                          />
                        ) : (
                          col.label
                        )}
                        <div
                          onMouseDown={(e) => onColResize(i, e)}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-300 dark:hover:bg-blue-700 active:bg-blue-400 dark:active:bg-blue-600"
                          style={{ zIndex: 1 }}
                        />
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-sky-50 dark:bg-sky-900/20 border-t border-gray-300 dark:border-gray-700 normal-case tracking-normal">
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5"></th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5"></th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.productName}
                        onChange={(event) => handleItemFilterDraftChange("productName", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Search product"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.barcode}
                        onChange={(event) => handleItemFilterDraftChange("barcode", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Search barcode"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.size}
                        onChange={(event) => handleItemFilterDraftChange("size", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Search size"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.designNo}
                        onChange={(event) => handleItemFilterDraftChange("designNo", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Search design"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.qty}
                        onChange={(event) => handleItemFilterDraftChange("qty", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Qty"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.cost}
                        onChange={(event) => handleItemFilterDraftChange("cost", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Cost"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.marginPerc}
                        onChange={(event) => handleItemFilterDraftChange("marginPerc", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Margin"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.sellingPrice}
                        onChange={(event) => handleItemFilterDraftChange("sellingPrice", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Sale"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.mrp}
                        onChange={(event) => handleItemFilterDraftChange("mrp", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="MRP"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.discountPerc}
                        onChange={(event) => handleItemFilterDraftChange("discountPerc", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Dis%"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.finalPrice}
                        onChange={(event) => handleItemFilterDraftChange("finalPrice", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Final"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-right font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="border-r border-b border-gray-300 dark:border-gray-700 p-1.5">
                      <input
                        type="text"
                        value={itemFilterDraft.status}
                        onChange={(event) => handleItemFilterDraftChange("status", event.target.value)}
                        onKeyDown={handleItemFilterKeyDown}
                        placeholder="Status"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs text-center font-normal bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!transportEntryId && !directPurchaseId ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
                        Open this page from the warehouse workflow to generate barcodes.
                      </td>
                    </tr>
                  ) : allItems.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
                        {isDirectPurchaseFlow
                          ? "No direct purchase items found for barcode generation."
                          : "No inventory items found for this transport entry. Add products first."}
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
                        No matching items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isGenerated = isGeneratedItem(generatedIds, item.sourceItemId);
                      const isActive = activeEditorId === item.sourceItemId;
                      const rowCells = [
                        <input
                          type="checkbox"
                          checked={!!checked[item.sourceItemId]}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => handleToggle(item)}
                          disabled={isGenerated}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />,
                        allItems.findIndex((row) => row.sourceItemId === item.sourceItemId) + 1,
                        <span className="font-medium truncate block text-gray-800 dark:text-gray-100">{item.productName}</span>,
                        <span className="text-xs truncate block text-gray-700 dark:text-gray-300">{barcodeForItem(barcodeMap, item.sourceItemId)}</span>,
                        item.size,
                        item.designNo,
                        item.qty,
                        item.cost.toFixed(2),
                        `${item.marginPerc}%`,
                        item.sellingPrice.toFixed(2),
                        item.mrp.toFixed(2),
                        `${item.discountPerc}%`,
                        item.finalPrice.toFixed(2),
                        isGenerated ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">Done</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">Pending</span>
                        ),
                      ];
                      return (
                        <tr
                          key={item.sourceItemId}
                          className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer ${isActive ? "bg-blue-100/70 dark:bg-blue-900/40" : checked[item.sourceItemId] ? "bg-blue-50/40 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"} ${isGenerated ? "opacity-75" : ""}`}
                          onClick={() => {
                            handleRowClick(item);
                          }}
                        >
                          {rowCells.map((cell, ci) => (
                            <td
                              key={ci}
                              className="px-1.5 py-1.5 border-r border-gray-200 dark:border-gray-700 overflow-hidden text-ellipsis whitespace-nowrap text-gray-700 dark:text-gray-300"
                              style={{ textAlign: columns[ci].align }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-2 text-xs text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <span>
                {selectedItems.length} of {allItems.length} items selected for generation
              </span>
              <span>Total: {allItems.length} items</span>
            </div>
          </div>
        </div>
      </div>

      <BarcodePreviewModal
        open={previewOpen}
        title={previewTitle}
        labels={previewLabels}
        customization={labelCustomization}
        storeName={storeName}
        qrSources={qrSources}
        qrLoading={qrLoading}
        onClose={closePreview}
        onPrint={handlePrintPreview}
      />

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default BarcodeGeneration;
