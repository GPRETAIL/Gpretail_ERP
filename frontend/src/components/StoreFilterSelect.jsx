import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/axios";

// Module-scope cache: every report page shares one companies fetch per session.
let cachedStores = null;
let inflight = null;

const loadStores = () => {
  if (cachedStores) return Promise.resolve(cachedStores);
  if (!inflight) {
    inflight = api
      .get("/companies", { params: { limit: 500 } })
      .then((res) => {
        cachedStores = res.data?.data || [];
        return cachedStores;
      })
      .catch(() => {
        inflight = null;
        return [];
      });
  }
  return inflight;
};

/**
 * Store filter for report screens. Renders only for the super admin, who may narrow a
 * report to a single store or leave it on "All Stores" for the consolidated view.
 * Store users never see it — the backend pins them to their own store regardless.
 */
const StoreFilterSelect = ({ value, onChange, label = "Store" }) => {
  const authUser = useSelector((state) => state.auth.user);
  const isSuperAdmin = String(authUser?.role || "").toLowerCase() === "super_admin";
  const [stores, setStores] = useState(cachedStores || []);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let active = true;
    loadStores().then((rows) => {
      if (active) setStores(rows);
    });
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md
          bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
          focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">All Stores (Consolidated)</option>
        {stores.map((store) => (
          <option key={store.id} value={String(store.id)}>
            {store.name || store.code || `Store ${store.id}`}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StoreFilterSelect;
