import { useCallback, useEffect, useState } from "react";
import api from "@/shared/api/apiClient";

export const money = value => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** A signed balance (+ debit) the way accountants read it: "1,250.00 Dr" / "300.00 Cr". */
export const drCr = value => (Math.abs(Number(value) || 0) < 0.005 ? "0.00" : `${money(Math.abs(value))} ${value > 0 ? "Dr" : "Cr"}`);

const pad = n => String(n).padStart(2, "0");
export const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = () => isoDate(new Date());
/** 1 April of the Indian financial year the date falls in. */
export const financialYearStart = (date = new Date()) => isoDate(new Date(date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1, 3, 1));

export const VOUCHER_TYPES = {
  sales: "Sales", sales_return: "Sales Return", receipt: "Receipt", payment: "Payment", purchase: "Purchase",
  purchase_return: "Purchase Return", journal: "Journal", contra: "Contra", transfer: "Stock Transfer",
};

export const errorText = (err, fallback) => {
  const data = err?.response?.data || {};
  const first = data.errors && Object.values(data.errors).flat()[0];
  return String(first || data.message || fallback);
};

/** Loads one accounting report; reloads when the path or params change. */
export function useFinanceReport(path, params) {
  const [state, setState] = useState({ data: null, meta: {}, loading: true, error: "" });
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    setState(current => ({ ...current, loading: true }));
    try {
      const res = await api.get(path, { params: JSON.parse(key) });
      const { data, ...meta } = res.data || {};
      setState({ data, meta, loading: false, error: "" });
    } catch (err) {
      setState({ data: null, meta: {}, loading: false, error: errorText(err, "Could not load the report.") });
    }
  }, [path, key]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  return { ...state, reload: load };
}

const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

/** Debit and credit totals of voucher lines being entered, and whether the voucher can be saved. */
export function voucherTotals(lines) {
  const debit = round2(lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0));
  const credit = round2(lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0));
  const used = lines.filter(line => line.ledger_account_id || Number(line.debit) || Number(line.credit));
  // Every line in use needs a ledger and exactly one of a debit or a credit.
  const valid = used.every(line => line.ledger_account_id && ((Number(line.debit) || 0) > 0) !== ((Number(line.credit) || 0) > 0));
  return { debit, credit, difference: round2(debit - credit), ready: valid && used.length >= 2 && debit > 0 && debit === credit };
}
