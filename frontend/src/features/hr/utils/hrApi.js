import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";
import { HR_MANAGER_ROLES, errorMessage } from "./hrStatus";

export const listOf = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);

/** Whether the signed-in user is HR (manages exits, pay-outs, encashment). */
export const useHrManager = () => HR_MANAGER_ROLES.includes(useSelector((state) => state.auth.user?.role));

/** Loads a list (again when the params change); null while loading. */
export function useLoader(url, params) {
  const [rows, setRows] = useState(null);
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    try {
      setRows((await api.get(url, { params: JSON.parse(key) })).data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load"));
      setRows([]);
    }
  }, [url, key]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  return [rows, load, setRows];
}

/** Posts, toasts the result and reloads; true when it worked. */
export const post = async (url, body, after) => {
  try {
    const res = await api.post(url, body);
    toast.success(res.data?.message || "Done");
    await after();
    return true;
  } catch (err) {
    toast.error(errorMessage(err, "Could not save"));
    return false;
  }
};

/** Active employees of the store, for HR acting on someone's behalf. */
export function useEmployees(enabled) {
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    api.get("/employees", { params: { limit: 500 } }).then((r) => active && setEmployees(listOf(r.data?.data ?? r.data).filter((e) => e.is_active !== false))).catch(() => {});
    return () => { active = false; };
  }, [enabled]);
  return employees;
}
