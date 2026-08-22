import api from "../api/axios";

const get = async (url, params = {}) => {
  const response = await api.get(url, { params });
  return response?.data?.data ?? response?.data ?? {};
};

const list = async (url, params = {}) => {
  const payload = await get(url, params);
  return Array.isArray(payload) ? payload : (payload.items ?? payload.data ?? []);
};

export const mobileApi = {
  dashboard: (params) => get("/dashboard", params),
  sales: (params) => list("/pos-sales", params),
  purchases: (params) => list("/invoices", params),
  inventory: (params) => get("/warehouse/dashboard", params),
  products: (params) => list("/products", params),
  customers: (params) => list("/customers", params),
  suppliers: (params) => list("/suppliers", params),
  expenses: (params) => list("/expenses", params),
  reports: (params) => get("/sales-reports", params),
  notifications: (params) => list("/notifications", params),
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
