import api from "../api/axios";
import { requestCacheScope } from "./requestCacheScope";

// A store's registered name/address/phone/GST essentially never changes mid-shift, but every POS
// print flow (POSSales, POSOld, TouchSales, POSReturn) was independently re-fetching it from
// /companies/{id} on every single receipt print - a redundant network round-trip on the critical
// path between "sale saved" and "print job queued", the same category of waste as the connector's
// printer-list re-query. Cached here, shared across all of them.
const CACHE_TTL_MS = 5 * 60 * 1000;
const pending = new Map();
const cache = new Map(); // companyId -> { data, fetchedAt }

const EMPTY_INFO = { storeName: "", storeAddress: "", storePhone: "", storeGstNo: "" };

// The last copy is also kept on this device, so a till that is offline (see pages/sales/posOffline.js)
// still prints the store's name, address and GST number on its receipts.
const savedKey = (id) => {
  let userId = "";
  try { userId = JSON.parse(localStorage.getItem("user") || "null")?.id || ""; } catch { /* no saved identity */ }
  return userId ? `vx_receipt_company:${userId}:${id}` : "";
};
const readSaved = (id) => {
  try { return JSON.parse(localStorage.getItem(savedKey(id)) || "null"); } catch { return null; }
};

export const getReceiptCompanyId = (record, user) =>
  record?.store_id || record?.company_id || record?.companyId || sessionStorage.getItem("activeStoreId") || user?.company_id || null;

export const requireReceiptStoreName = (companyInfo) => {
  const name = String(companyInfo?.storeName || "").trim();
  if (!name) throw new Error("Store name is unavailable. Refresh the store details before printing.");
  return name;
};

export const fetchReceiptCompanyInfo = async (companyId) => {
  const id = Number(companyId || 0);
  if (!id) return { ...EMPTY_INFO };
  const key = `${requestCacheScope()}:${id}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    try {
      const res = await api.get(`/companies/${id}`);
      const company = res.data?.data || {};
      const info = {
        storeName: String(company.name || company.reg_name || company.regName || "").trim(),
        storeAddress: String(company.address || "").trim(),
        storePhone: String(company.contact_no || company.phone || company.contactNo || "").trim(),
        storeGstNo: String(company.gst_no || company.gstin || company.gstNo || "").trim(),
      };
      cache.set(key, { data: info, fetchedAt: Date.now() });
      try { if (savedKey(id)) localStorage.setItem(savedKey(id), JSON.stringify(info)); } catch { /* storage full or blocked */ }
      if (cache.size > 50) cache.delete(cache.keys().next().value);
      return info;
    } catch {
      // Not cached - a transient network hiccup shouldn't lock in blank company info for the whole
      // TTL window; the next print attempt should just try the request again. Until then, print
      // with the last details this device saw.
      return cached?.data || readSaved(id) || { ...EMPTY_INFO };
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, request);
  return request;
};
