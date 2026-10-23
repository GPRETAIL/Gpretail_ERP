import { describe, it, expect, vi } from "vitest";
import { runPosCheckout } from "../posCheckout";

describe("POS save entry points", () => {
  it.each([false, true])("opens checkout for paid mode with printing=%s", shouldPrint => {
    const openPaymentDialog = vi.fn(); const saveSale = vi.fn();
    runPosCheckout({ prefs: { saleSaveAs: "paid_settled", paymentDialogVisible: true }, shouldPrint, openPaymentDialog, saveSale });
    expect(openPaymentDialog).toHaveBeenCalledOnce(); expect(saveSale).not.toHaveBeenCalled();
  });
  it.each([["paid_settled", false], ["unsettled", false], ["unsettled", true]])("saves %s with checkout=%s consistently", (saleSaveAs, paymentDialogVisible) => {
    for (const shouldPrint of [false, true]) {
      const saveSale = vi.fn(); const openPaymentDialog = vi.fn();
      const quickPaymentForm = ({ unsettled }) => ({ cashAmount: unsettled ? "" : "100" });
      runPosCheckout({ prefs: { saleSaveAs, paymentDialogVisible }, shouldPrint, openPaymentDialog, saveSale, quickPaymentForm });
      expect(openPaymentDialog).not.toHaveBeenCalled();
      expect(saveSale).toHaveBeenCalledWith({ shouldPrint, allowUnsettledWithoutPayment: saleSaveAs === "unsettled", paymentFormOverride: { cashAmount: saleSaveAs === "unsettled" ? "" : "100" } });
    }
  });
});
