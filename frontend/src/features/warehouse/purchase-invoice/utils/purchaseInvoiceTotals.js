export function calculatePurchaseInvoiceTotals(itemsList, pcsDiscount, rounding) {
    let baseAmount = 0;
    let discountTotal = 0;
    let taxCharges = 0;

    for (const item of itemsList) {
      baseAmount += parseFloat(item.amountOn) || 0;
      discountTotal += parseFloat(item.discount) || 0;
      taxCharges += ((parseFloat(item.amountOn) || 0) - (parseFloat(item.discount) || 0)) * ((parseFloat(item.taxPerc) || 0) / 100);
    }

    const afterDiscount = baseAmount - discountTotal - (parseFloat(pcsDiscount) || 0);
    const grossAmount = afterDiscount + taxCharges;
    const netAmount = grossAmount + (parseFloat(rounding) || 0);

    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      discount: Math.round(discountTotal * 100) / 100,
      pcsDiscount: parseFloat(pcsDiscount) || 0,
      taxCharges: Math.round(taxCharges * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      rounding: parseFloat(rounding) || 0,
      netAmount: Math.round(netAmount * 100) / 100,
    };
}
