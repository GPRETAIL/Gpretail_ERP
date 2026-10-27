// Shared display rules preserve zero and false, and accept API relation names.
export const recordBoolean = value => value === true || value === 1 || ["true", "1", "yes"].includes(String(value).toLowerCase());
export const recordName = value => value?.name ?? value?.size_name ?? value?.group_name ?? "";
const isSelectedPurchaseAttribute = attribute => {
  if (!attribute) return false;
  if (attribute.selected !== undefined) return recordBoolean(attribute.selected);
  const flags = ["man", "show", "rol"];
  return flags.some(key => Object.hasOwn(attribute, key)) ? flags.some(key => recordBoolean(attribute[key])) : true;
};

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return toText(value);
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// rowKey is a synthesized composite key, not the numeric id -- delete/update act on
// (code, company_id) pairs (see parseSelectedProductKey below and the backend's
// /products/{code}?company_id=... contract), and code alone is only unique per store.
export const mapProductRow = (p) => ({
  id: p.id,
  company_id: p.company_id || (p.company_ref ?? p.companyRef)?.id || null,
  rowKey: `${p.company_id || (p.company_ref ?? p.companyRef)?.id || 0}:${toText(p.code)}`,
  code: toText(p.code),
  name: toText(p.name),
  productGroup: toText(p.product_group?.name || p.productGroup?.name || p.category?.name),
  brand: toText(p.brand?.name),
  company: p.company_ref?.name || p.companyRef?.name || (typeof p.company === "string" ? p.company : p.company?.name) || "--",
  hsn: toText(p.hsn || p.hsn_code),
  type: toText(p.type),
  uom: toText(p.uom || p.unit),
  section: toText(p.section),
  sellingMode: toText(p.selling_mode),
  salesTax: (p.sales_tax || p.salesTax || p.tax)
    ? `${toText((p.sales_tax || p.salesTax || p.tax).name)} (${toText((p.sales_tax || p.salesTax || p.tax).tax_percentage ?? (p.sales_tax || p.salesTax || p.tax).rate, "0")}%)`
    : "--",
  purchaseTax: (p.purchase_tax || p.purchaseTax)
    ? `${toText((p.purchase_tax || p.purchaseTax).name)} (${toText((p.purchase_tax || p.purchaseTax).tax_percentage ?? (p.purchase_tax || p.purchaseTax).rate, "0")}%)`
    : "--",
  sizeGroup: toText(p.size_group?.name || p.sizeGroup?.name || p.sizeGroup?.group_name || p.size_group?.group_name),
  barcodeMode: toText(p.barcode_mode),
  barcodeSource: toText(p.barcode_source),
  barcodeId: toText(p.barcode_id ?? p.barcode),
  discountMode: toText(p.discount_mode),
  discountModeValue: toText(p.discount_mode_value),
  marginMin: toText(p.margin_min),
  marginMax: toText(p.margin_max),
  stockHoldingPeriod: toText(p.stock_holding_period),
  purchasePlanMode: toText(p.purchase_plan_mode),
  expectedGender: toText(p.expected_gender),
  dumping: recordBoolean(p.dumping) ? "Yes" : "No",
  dumpingValue: toText(p.dumping_value),
  cess: recordBoolean(p.cess) ? "Yes" : "No",
  cessValue: toText(p.cess_value),
  dailyPrice: recordBoolean(p.daily_price) ? "Yes" : "No",
  dailyPriceValue: toText(p.daily_price_value),
  isCore: recordBoolean(p.is_core) ? "Yes" : "No",
  isCoreValue: toText(p.is_core_value),
  excludeReward: recordBoolean(p.exclude_reward) ? "Yes" : "No",
  autoPo: recordBoolean(p.auto_po) ? "Yes" : "No",
  autoPoValue: toText(p.auto_po_value),
  createdBy: toText(p.created_by || p.createdByName),
  createdAt: formatDateTime(p.created_at || p.createdAt),
  updatedBy: toText(p.updated_by || p.updatedByName),
  updatedAt: formatDateTime(p.updated_at || p.updatedAt),
  purchaseEntryAttrs: Array.isArray(p.purchase_entry_attributes)
    ? p.purchase_entry_attributes
        .filter(isSelectedPurchaseAttribute)
        .map((a) => a.name)
        .filter(Boolean)
        .join(", ") || "--"
    : "--",
  active: recordBoolean(p.active ?? p.is_active) ? "Yes" : "No",
});

