import api from "../api/axios";

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTimestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSaleBillNo = (value) => `SB/${toNum(value, 0)}`;

const formatReturnNo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  return `RR/${toNum(value, 0)}`;
};

const LATEST_POS_DOCUMENT_META = {
  sale: { label: "POS Sale", deletePath: (id) => `/pos-sales/${id}` },
  return: { label: "POS Return", deletePath: (id) => `/pos-returns/${id}` },
  touch_sale: { label: "Touch Sale", deletePath: null },
  // POS Old writes into the same pos_sales table via storeLegacy() -> store(), so it deletes
  // through the same route as a regular POS Sale.
  pos_old_sale: { label: "POS Old", deletePath: (id) => `/pos-sales/${id}` },
};

// PosSale stores its bill total as `grand_total` and PosReturn as `total_refund` - neither
// row shape has a plain `amount` field, which is what the Last Bill panel displays.
const resolveDocumentAmount = (type, row) =>
  type === "return" ? toNum(row?.total_refund, 0) : toNum(row?.grand_total, 0);

const normalizeLatestDocument = (type, row) => {
  if (!row) return null;
  const documentAt =
    row.return_at
    || row.sale_at
    || row.created_at
    || row.createdAt
    || null;
  return {
    type,
    documentAt,
    ...row,
    amount: resolveDocumentAmount(type, row),
  };
};

const fetchLatestRows = async (url, type) => {
  const res = await api.get(url, { params: { page: 1, limit: 1 } });
  const row = res.data?.data?.[0] || null;
  return normalizeLatestDocument(type, row);
};

export const formatLatestPosDocumentNumber = (doc) => {
  if (!doc) return "";
  if (doc.type === "return") {
    return doc.display_return_no || formatReturnNo(doc.return_no);
  }
  return formatSaleBillNo(doc.bill_no || doc.id);
};

export const formatLatestPosDocumentLabel = (doc) => {
  if (!doc) return "";
  const meta = LATEST_POS_DOCUMENT_META[doc.type] || LATEST_POS_DOCUMENT_META.sale;
  if (doc.type === "return") {
    const returnNo = doc.display_return_no || formatReturnNo(doc.return_no);
    return `${meta.label} ${returnNo}`;
  }
  return `${meta.label} ${formatSaleBillNo(doc.bill_no || doc.id)}`;
};

export const canDeleteLatestPosDocument = (doc) =>
  Boolean(LATEST_POS_DOCUMENT_META[doc?.type]?.deletePath?.(doc?.id));

export const getLatestPosDocumentFetchPath = (doc) => {
  if (!doc?.id) return "";
  switch (doc.type) {
    case "return":
      return `/pos-returns/${doc.id}`;
    case "touch_sale":
      return `/touch-sales/${doc.id}`;
    case "pos_old_sale":
      // POS Old writes into the same pos_sales table via storeLegacy() -> store(), and
      // pos-old-sales only has list/create routes registered, no single-record GET.
      return `/pos-sales/${doc.id}`;
    default:
      return `/pos-sales/${doc.id}`;
  }
};

export const getLatestPosDocumentDeletePath = (doc) => {
  const deletePath = LATEST_POS_DOCUMENT_META[doc?.type]?.deletePath;
  return deletePath ? deletePath(doc.id) : "";
};

export const loadLatestPosDocument = async () => {
  const results = await Promise.allSettled([
    fetchLatestRows("/pos-sales", "sale"),
    fetchLatestRows("/pos-returns", "return"),
    fetchLatestRows("/touch-sales", "touch_sale"),
    fetchLatestRows("/pos-old-sales", "pos_old_sale"),
  ]);

  const documents = results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);

  if (!documents.length) return null;

  return documents.reduce((latest, current) =>
    toTimestamp(current.documentAt) >= toTimestamp(latest.documentAt) ? current : latest
  );
};
