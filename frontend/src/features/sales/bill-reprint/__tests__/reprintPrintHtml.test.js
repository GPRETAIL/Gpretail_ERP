import { describe, expect, it } from "vitest";
import { markReprint, reprintStampHtml } from "@/features/printing/utils/reprintStamp";
import { buildDocumentPrintHtml, documentLine, gstSummary } from "@/features/printing/utils/documentPrintHtml";

const COMPANY = { storeName: "Coffee 1", storeAddress: "12 Main Road", storePhone: "0431 222", storeGstNo: "33ABCDE1234F1Z5" };

describe("DUPLICATE mark", () => {
  it("is a small outlined tag at the top right, with the reprint line and copy label under it", () => {
    const html = markReprint("<html><head></head><body class=\"r\"><div>Coffee 1</div></body></html>",
      { count: 2, at: "2026-11-17T16:10:00Z", user: "Anbu", copyLabel: "Duplicate for transporter" });
    const body = html.slice(html.indexOf("<body"));
    expect(body.indexOf("DUPLICATE")).toBeLessThan(body.indexOf("Coffee 1"));
    expect(body).toMatch(/justify-content:flex-end/);
    expect(body).toMatch(/font-size:8pt/);
    expect(body).toMatch(/border:0\.6pt solid/);
    expect(body).toContain("Reprint #2 · ");
    expect(body).toContain(" · Anbu");
    expect(body).toContain("Duplicate for transporter");
    expect(body).not.toMatch(/watermark|rotate|opacity/i);
  });

  it("goes inside the receipt box, which is all a thermal printer renders", () => {
    const html = markReprint('<html><body><div class="receipt"><div>Store</div></div></body></html>', { count: 1 });
    expect(html).toMatch(/<div class="receipt"><div class="vx-reprint"/);
  });

  it("is a touch larger on A4 and escapes names", () => {
    const stamp = reprintStampHtml({ count: 1, user: "<b>x</b>" }, { paper: "a4" });
    expect(stamp).toMatch(/font-size:9\.5pt/);
    expect(stamp).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(markReprint("plain", { count: 1 })).toMatch(/^<div class="vx-reprint"/);
  });
});

describe("A4 document layout", () => {
  it("takes the GST rate from each line's tax and splits it CGST / SGST", () => {
    const lines = [
      documentLine({ product_name: "Shirt", quantity: 2, price: 500, discount: 0, tax_amount: 50, total: 1050 }),
      documentLine({ product_name: "Saree", quantity: 1, price: 2000, discount: 100, tax_amount: 228, total: 2128 }),
    ];
    expect(lines.map((l) => [l.taxable, l.rate])).toEqual([[1000, 5], [1900, 12]]);
    expect(gstSummary(lines)).toEqual([{ rate: 5, taxable: 1000, tax: 50 }, { rate: 12, taxable: 1900, tax: 228 }]);
  });

  it("dealer invoice: store header, the dealer's phone and GSTIN, items, GST summary and balance", () => {
    const html = buildDocumentPrintHtml("dealer_invoice", {
      bill_no: "D261116-0001", invoice_date: "2026-11-16", grand_total: 1050, paid_amount: 800, balance: 250,
      customer: { name: "Ravi Traders", phone: "9876543210", gstin: "33RAVI0000T1Z9", address: "4 Bazaar St" },
      items: [{ product_name: "Shirt", quantity: 2, price: 500, discount: 0, tax_amount: 50, total: 1050 }],
      payments: [{ mode: "UPI", amount: 800, reference_no: "UTR1" }],
    }, { companyInfo: COMPANY });
    expect(html).toContain("Tax Invoice");
    expect(html).toContain("33ABCDE1234F1Z5");
    expect(html).toContain("9876543210");
    expect(html).toContain("33RAVI0000T1Z9");
    expect(html).toContain("D261116-0001");
    expect(html).toContain(">5%<");
    expect(html).toContain("Balance due");
    expect(html).toContain("UPI ₹800.00 (UTR1)");
  });

  it("dealer receipt and customer order have their own titles", () => {
    expect(buildDocumentPrintHtml("dealer_receipt", { bill_no: "R261117-0001", amount: 500, mode: "CASH", customer_name: "Ravi Traders",
      allocations: [{ bill_no: "D261116-0001", amount: 500 }] }, { companyInfo: COMPANY })).toContain("Payment Receipt");
    const order = buildDocumentPrintHtml("customer_order", { order_no: "CO-7", order_date: "2026-11-10", net_amount: 900, advance_paid: 200, balance_due: 700,
      customer: { name: "Meena", phone: "9000000001" }, items: [{ product_name: "Blouse", quantity: 1, price: 900, tax_amount: 0, total: 900 }] }, { companyInfo: COMPANY });
    expect(order).toContain("Customer Order");
    expect(order).toContain("Advance paid");
  });
});
