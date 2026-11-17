import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";
import { BILLING_DATE_EVENT } from "@/features/sales/pos/utils/billingDate";

const REFRESH_MS = 60000;

/**
 * Which date this counter's bills go on now (Sales Customisation > Billing date after cash closing):
 * { mode, date, today, max_date, shifted, can_change, reason } from GET /pos-sales/billing-date, refreshed every minute
 * (or refreshMs) and when the window regains focus. change("today" | "tomorrow" | "YYYY-MM-DD") sets it in Manual mode.
 * Every change is announced (BILLING_DATE_EVENT) so the footer and other screens show the new date at once. state
 * stays null on older servers, offline or without POS access: bills then simply go on today.
 */
export default function useBillingDate({ refreshMs = REFRESH_MS } = {}) {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/billing-date");
      setState(res.data?.data || null);
    } catch {
      // Older servers, offline or no POS access: bills simply go on today.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, refreshMs);
    const announced = (event) => setState(event.detail || null);
    window.addEventListener("focus", load);
    window.addEventListener(BILLING_DATE_EVENT, announced);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener(BILLING_DATE_EVENT, announced);
    };
  }, [load, refreshMs]);

  const change = useCallback(async (which) => {
    if (!which || saving) return;
    setSaving(true);
    try {
      const res = await api.post("/pos-sales/billing-date", { date: which });
      const next = res.data?.data || null;
      setState(next);
      window.dispatchEvent(new CustomEvent(BILLING_DATE_EVENT, { detail: next }));
      toast.success(res.data?.message || "Billing date changed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the billing date.");
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return { state, saving, change };
}
