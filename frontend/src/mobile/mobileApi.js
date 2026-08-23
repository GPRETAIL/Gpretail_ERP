import api from "../api/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const get = async (url, params = {}) => unwrap(await api.get(url, { params }));
const list = async (url, params = {}) => {
  const payload = await get(url, params);
  return Array.isArray(payload) ? payload : (payload.items ?? payload.data ?? payload.results ?? []);
};
const create = async (url, payload) => unwrap(await api.post(`/${url}`, payload));
const update = async (url, id, payload) => unwrap(await api.put(`/${url}/${id}`, payload));
const remove = async (url, id) => unwrap(await api.delete(`/${url}/${id}`));

export const mobileApi = {
  dashboard: (params) => get("/dashboard", params),
  sales: (params) => list("/pos-sales", params),
  sale: (id) => get(`/pos-sales/${id}`),
  createSale: (payload) => create("pos-sales", payload),
  purchases: (params) => list("/invoices", params),
  purchase: (id) => get(`/invoices/${id}`),
  createPurchase: (payload) => create("invoices", payload),
  updatePurchase: (id, payload) => update("invoices", id, payload),
  deletePurchase: (id) => remove("invoices", id),
  inventory: (params) => get("/warehouse/dashboard", params),
  inventoryEntries: (params) => list("/inventory-entries", params),
  inventoryEntry: (id) => get(`/inventory-entries/${id}`),
  createInventoryEntry: (payload) => create("inventory-entries", payload),
  updateInventoryEntry: (id, payload) => update("inventory-entries", id, payload),
  deleteInventoryEntry: (id) => remove("inventory-entries", id),
  products: (params) => list("/products", params),
  customers: (params) => list("/customers", params),
  suppliers: (params) => list("/suppliers", params),
  expenses: (params) => list("/expenses", params),
  reports: (params) => get("/sales-reports", params),
  notifications: (params) => list("/notifications", params),
  create,
  update,
  remove,
};

export async function loadMobilePage(loader, params) {
  try {
    return { data: await loader(params), error: null };
  } catch (error) {
    return {
      data: null,
      error: error?.response?.data?.message || error?.message || "Unable to load data",
    };
  }
}
