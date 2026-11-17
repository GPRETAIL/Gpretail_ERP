import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";

const REFRESH_MS = 60000;

/**
 * Which date this counter's bills go on now (Sales Customisation > Billing date after cash closing):
 * { mode, date, shifted, can_change, reason } from GET /pos-sales/billing-date, refreshed every minute and when the
 * window regains focus. change("today" | "tomorrow") switches it in Manual mode. state stays null on older servers
 * or offline: bills then simply go on today.
 */
export default function useBillingDate() {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/billing-date");
      setState(res.data?.data || null);
    } catch {
      // Older servers or offline: bills simply go on today.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [load]);

  const change = useCallback(async (which) => {
    if (!which || saving) return;
    setSaving(true);
    try {
      const res = await api.post("/pos-sales/billing-date", { date: which });
      setState(res.data?.data || null);
      toast.success(res.data?.message || "Billing date changed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the billing date.");
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return { state, saving, change };
}
