/** Dashboard > Supplier Payments: one supplier's pending bills on the Supplier Payment page. */
export const supplierPaymentPath = (row) => `/finance/supplier-payment?supplier_id=${row.supplierId}&supplier=${encodeURIComponent(row.supplierName || "")}`;

/** One bill, opened ready to pay. */
export const supplierBillPath = (row) => `/finance/supplier-payment?openInvoiceType=${row.docType}&openInvoiceId=${row.docId}`;
