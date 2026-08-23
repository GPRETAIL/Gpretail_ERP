import api from "../api/axios";

// A store's registered name/address/phone/GST essentially never changes mid-shift, but every POS
// print flow (POSSales, POSOld, TouchSales, POSReturn) was independently re-fetching it from
// /companies/{id} on every single receipt print - a redundant network round-trip on the critical
// path between "sale saved" and "print job queued", the same category of waste as the connector's
// printer-list re-query. Cached here, shared across all of them.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // companyId -> { data, fetchedAt }

const EMPTY_INFO = { storeName: "", storeAddress: "", storePhone: "", storeGstNo: "" };

export const fetchReceiptCompanyInfo = async (companyId) => {
  const id = Number(companyId || 0);
  if (!id) return { ...EMPTY_INFO };

  const cached = cache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await api.get(`/companies/${id}`);
    const company = res.data?.data || {};
    const info = {
      storeName: String(company.name || company.reg_name || company.regName || "").trim(),
      storeAddress: String(company.address || "").trim(),
      storePhone: String(company.contact_no || company.phone || company.contactNo || "").trim(),
      storeGstNo: String(company.gst_no || company.gstin || company.gstNo || "").trim(),
    };
    cache.set(id, { data: info, fetchedAt: Date.now() });
    return info;
  } catch {
    // Not cached - a transient network hiccup shouldn't lock in blank company info for the whole
    // TTL window; the next print attempt should just try the request again.
    return { ...EMPTY_INFO };
  }
};
