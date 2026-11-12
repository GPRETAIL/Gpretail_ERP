import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import {
  buildBlankCounts, buildClosingSlipHtml, closingFigures, countedTotal, formatEmployee, printHtmlInIframe, toInt, toNum,
} from "./cashClosingUtils";

const EMPTY_POSITION = { sessionId: null, openingAmount: 0, cashSales: 0, cashRefunds: 0, expectedBeforeExpenses: 0 };

/**
 * State and actions of the Cash Closing form, used by the Sales > Cash Closing page and POS Old's Close dialog.
 * The counter's open session (opening float, cash sales, refunds) comes from /cash-closings/opening-amount;
 * Save closes that session and Print makes the closing slip.
 */
export default function useCashClosingForm({ defaultCounterId = "", onSaved } = {}) {
  const authUser = useSelector((state) => state.auth.user);
  const [now, setNow] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ counters: [], receivedByEmployees: [], cashiers: [] });
  const [closingBillNo, setClosingBillNo] = useState(1);
  const [loadedPosition, setPosition] = useState(EMPTY_POSITION);
  const [formData, setFormData] = useState({
    counterId: defaultCounterId ? String(defaultCounterId) : "",
    receivedByEmployeeId: "",
    cashierEmployeeId: "",
    counterExpenses: "0",
    notes: "",
    ...buildBlankCounts(),
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMeta = useCallback(async ({ signal }) => {
    const res = await api.get("/cash-closings/meta", { signal });
    const payload = res.data?.data || {};
    const mapSelect = (rows, formatter = (x) => x.name) => (rows || []).map((row) => ({ value: String(row.id), label: formatter(row) }));
    return {
      counters: mapSelect(payload.counters),
      receivedByEmployees: mapSelect(payload.receivedByEmployees, formatEmployee),
      cashiers: mapSelect(payload.cashiers, formatEmployee),
    };
  }, []);
  const { loading: loadingMeta } = useAsyncQuery(fetchMeta, {
    onSuccess: setOptions,
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to load cash closing options");
      setOptions({ counters: [], receivedByEmployees: [], cashiers: [] });
    },
  });

  const fetchNextBillNo = useCallback(async ({ signal }) => {
    const response = await api.get("/cash-closings/next-bill-no", { signal });
    return toInt(response.data?.data?.billNo, 1);
  }, []);
  const { reload: reloadBillNo } = useAsyncQuery(fetchNextBillNo, { onSuccess: setClosingBillNo, onError: () => setClosingBillNo(1) });

  const counterId = formData.counterId;
  const fetchPosition = useCallback(async ({ signal }) => {
    const response = await api.get("/cash-closings/opening-amount", { params: { counterId }, signal });
    const data = response.data?.data || {};
    return {
      sessionId: data.sessionId ?? null,
      openingAmount: toNum(data.openingAmount, 0),
      cashSales: toNum(data.cashSales, 0),
      cashRefunds: toNum(data.cashRefunds, 0),
      expectedBeforeExpenses: toNum(data.expectedBeforeExpenses, 0),
    };
  }, [counterId]);
  const { loading: loadingPosition, reload: reloadPosition } = useAsyncQuery(fetchPosition, {
    enabled: Boolean(counterId), onSuccess: setPosition, onError: () => setPosition(EMPTY_POSITION),
  });
  const position = counterId ? loadedPosition : EMPTY_POSITION;
  const counterOpen = Boolean(counterId && position.sessionId);

  const closingAmount = useMemo(() => countedTotal(formData), [formData]);
  const figures = useMemo(() => closingFigures(position, formData.counterExpenses, closingAmount), [position, formData.counterExpenses, closingAmount]);
  const labelOf = (list, value) => list.find((row) => row.value === value)?.label || "-";

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const handleCountChange = (key, raw) => {
    if (raw === "") return setField(key, "");
    const parsed = toInt(raw, 0);
    if (parsed >= 0) setField(key, String(parsed));
    return undefined;
  };

  const validate = () => {
    if (!formData.counterId) return "Counter is required";
    if (!counterOpen) return "This counter is not open. Open it in Cash Opening first.";
    // People are required only when the store keeps employees (HRMS) to choose from.
    if (options.receivedByEmployees.length > 0 && !formData.receivedByEmployeeId) return "Received By is required";
    if (options.cashiers.length > 0 && !formData.cashierEmployeeId) return "Cashier is required";
    return null;
  };

  const handlePrint = async (billNo = closingBillNo) => {
    if (!formData.counterId) {
      toast.error("Counter is required before printing");
      return;
    }
    let storeName = String(authUser?.name || "").trim();
    if (String(authUser?.role || "").toLowerCase() === "user" && authUser?.company_id) {
      try {
        const companyRes = await api.get(`/companies/${authUser.company_id}`);
        storeName = String(companyRes.data?.data?.admin_user?.name || "").trim() || storeName;
      } catch {
        // Keep the user's name if the store lookup fails.
      }
    }
    const html = buildClosingSlipHtml({
      storeName: storeName || String(authUser?.email || "Cash Closing"),
      printedAt: new Date().toLocaleString(),
      counterName: labelOf(options.counters, formData.counterId),
      receivedByName: labelOf(options.receivedByEmployees, formData.receivedByEmployeeId),
      cashierName: labelOf(options.cashiers, formData.cashierEmployeeId),
      billNo, position, figures, closingAmount, formData,
    });
    if (!printHtmlInIframe(html)) toast.error("Failed to prepare print document.");
  };

  /** Closes the counter's session; with print, prints the slip for the saved closing number first. */
  const handleSave = async ({ print = false } = {}) => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return null;
    }
    const payload = {
      counterId: formData.counterId,
      receivedByEmployeeId: formData.receivedByEmployeeId,
      cashierEmployeeId: formData.cashierEmployeeId,
      counterExpenses: figures.expenses,
      notes: String(formData.notes || "").trim(),
      ...Object.fromEntries(Object.keys(buildBlankCounts()).map((key) => [key, Math.max(0, toInt(formData[key], 0))])),
    };
    setSaving(true);
    try {
      const res = await api.post("/cash-closings", payload);
      const saved = res.data?.data || {};
      toast.success(`Cash closing saved (Bill #${saved.bill_no})`);
      if (print) await handlePrint(saved.bill_no);
      setFormData((prev) => ({ ...prev, counterExpenses: "0", notes: "", ...buildBlankCounts() }));
      reloadBillNo();
      reloadPosition();
      onSaved?.(saved);
      return saved;
    } catch (err) {
      toast.error(err?.response?.data?.errors?.counterId?.[0] || err?.response?.data?.message || "Failed to save cash closing");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    now, saving, options, loadingMeta, closingBillNo, formData, setField, handleCountChange,
    position, loadingPosition, counterOpen, closingAmount, figures, handleSave, handlePrint,
  };
}
