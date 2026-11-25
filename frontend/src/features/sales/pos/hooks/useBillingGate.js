import { useCallback, useEffect, useState } from "react";
import api from "@/shared/api/apiClient";

/**
 * POS screens: a bill needs the cashier's counter and, depending on Sales Customisation > Cash Opening before
 * billing, that counter's cash opened. Checks when the page opens and when the window regains focus
 * (GET cash-openings/billing-status), and turns a refused save (422 COUNTER_REQUIRED / CASH_NOT_OPENED) into the
 * right popup.
 *   block:   { code, message } while the "Cash not opened" dialog shows (mode "block", or a refused save).
 *   warning: { code, message } while the cash is not opened in mode "warn": a notice, billing still works.
 */
export default function useBillingGate({ onCounterRequired } = {}) {
  const [block, setBlock] = useState(null);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.get("/cash-openings/billing-status")
      .then((res) => {
        if (!alive) return;
        const status = res.data?.data || {};
        setWarning(status.warning?.code === "CASH_NOT_OPENED" ? status.warning : null);
        if (status.block?.code === "CASH_NOT_OPENED") setBlock(status.block);
      })
      .catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => { alive = false; window.removeEventListener("focus", load); };
  }, []);

  /** true when the error was a billing block (and its popup is now shown). */
  const handleError = useCallback((err) => {
    const data = err?.response?.data;
    if (data?.code === "CASH_NOT_OPENED") {
      setBlock({ code: data.code, message: data.message });
      return true;
    }
    if (data?.code === "COUNTER_REQUIRED") {
      onCounterRequired?.();
      return true;
    }
    return false;
  }, [onCounterRequired]);

  return { block, warning, close: useCallback(() => setBlock(null), []), handleError };
}
