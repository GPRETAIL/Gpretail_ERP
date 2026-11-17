import { useCallback, useEffect, useState } from "react";
import api from "@/shared/api/apiClient";

/**
 * POS screens: a bill needs the cashier's counter and (Sales Customisation) that counter's cash opened first.
 * Checks when the page opens (GET cash-openings/billing-status) and turns a refused save (422 COUNTER_REQUIRED /
 * CASH_NOT_OPENED) into the right popup. block: { code, message } while the "Cash not opened" dialog shows.
 */
export default function useBillingGate({ onCounterRequired } = {}) {
  const [block, setBlock] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/cash-openings/billing-status")
      .then((res) => {
        if (alive && res.data?.data?.block?.code === "CASH_NOT_OPENED") setBlock(res.data.data.block);
      })
      .catch(() => {});
    return () => { alive = false; };
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

  return { block, close: useCallback(() => setBlock(null), []), handleError };
}
