import { expect, test } from "@playwright/test";
import { BARCODE, api, asUser, today } from "./support/session";

/** The voucher posted for a document, as { ledger: signed amount (+ debit) }. */
async function postedVoucher(books, voucherNo) {
  const day = (await books.get(`/accounting/daybook?from=${today()}&to=${today()}`)).body?.data || [];
  const voucher = day.find(row => row.voucher_no === voucherNo);
  return voucher ? Object.fromEntries(voucher.lines.map(line => [line.account, line.debit - line.credit])) : null;
}

test("a cashier bills a cash sale at the POS and it reaches the books", async ({ browser, request }) => {
  const { page, close } = await asUser(browser, "cashier");
  await page.goto("/sales/pos-sales");
  const scan = page.getByPlaceholder("Scan / enter barcode");
  await scan.fill(BARCODE);
  await scan.press("Enter");
  await expect(page.getByText(BARCODE, { exact: true })).toBeVisible(); // The scanned line.

  const saved = page.waitForResponse(res => /\/api\/pos-sales$/.test(res.url()) && res.request().method() === "POST");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByPlaceholder("Enter cash received").fill("100000");
  await page.getByRole("button", { name: "Save & Print" }).last().click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const sale = (await response.json()).data;

  await close();

  // A manager (separate session) checks the books, then deletes the test bill.
  const manager = await asUser(browser, "manager");
  const books = api(request, manager.token);
  try {
    const lines = await postedVoucher(books, sale.invoice_no);
    expect(lines).not.toBeNull();
    expect(lines["Cash in Hand"]).toBeCloseTo(Number(sale.grand_total), 2);
    expect(lines.Sales).toBeLessThan(0);
  } finally {
    expect((await books.delete(`/pos-sales/${sale.id}`)).status).toBe(200);
  }
  expect(await postedVoucher(books, sale.invoice_no)).toBeNull(); // Deleting the bill takes it out of the books.
  await manager.close();
});

test("a dispatched transfer posts to the sender's books and cancelling it reverses everything", async ({ browser, request }) => {
  const manager = await asUser(browser, "manager");
  const books = api(request, manager.token);
  const destinations = (await books.get("/stock-outwards/destinations")).body?.data || [];
  test.skip(destinations.length === 0, "The test store has no other store to transfer to.");
  const lookup = async () => (await books.get(`/pos-sales/barcode-lookup?barcode=${BARCODE}`)).body?.data;
  const product = await lookup();
  test.skip(!product?.variantId, `No sellable ${BARCODE} in the test store.`);

  const stockBefore = product.stock_qty;
  const dispatched = await books.post("/stock-outwards", {
    target_store_id: destinations[0].id, outward_date: today(), transfer_key: crypto.randomUUID(),
    items: [{ product_id: product.id, variant_id: product.variantId, quantity: 1, unit_price: 100 }],
  });
  expect(dispatched.status).toBe(201);
  const transfer = dispatched.body.data;
  try {
    const lines = await postedVoucher(books, transfer.outward_no);
    expect(lines).toEqual({ [destinations[0].name]: 100, "Stock Transfers Out": -100 });
  } finally {
    expect((await books.post(`/stock-outwards/${transfer.uuid}/cancel`)).status).toBe(200);
  }
  expect(await postedVoucher(books, transfer.outward_no)).toBeNull();
  expect((await lookup()).stock_qty).toBe(stockBefore); // The stock came back.
  expect((await books.delete(`/stock-outwards/${transfer.id}`)).status).toBe(200); // Leave no test transfer behind.
  await manager.close();
});
