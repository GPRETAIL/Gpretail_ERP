export function runPosCheckout({ prefs, shouldPrint, openPaymentDialog, saveSale, quickPaymentForm }) {
  const unsettled = prefs.saleSaveAs === "unsettled";
  if (prefs.paymentDialogVisible && !unsettled) return openPaymentDialog();
  return saveSale({ shouldPrint, paymentFormOverride: quickPaymentForm({ unsettled }), allowUnsettledWithoutPayment: unsettled });
}
