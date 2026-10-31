import { expect, test } from "@playwright/test";
import { api, asUser, today } from "./support/session";

test("a manager enters a payment voucher, sees it in the books, and deletes it", async ({ browser, request }) => {
  const { page, token, close } = await asUser(browser, "manager");
  const books = api(request, token);
  const narration = `E2E rent ${Date.now()}`;

  await page.goto("/finance/voucher-entry");
  await page.getByRole("button", { name: "Payment" }).click();
  const ledgers = page.getByText("Choose ledger");
  await ledgers.first().click();
  await page.getByRole("listitem").filter({ hasText: /^Rent \(/ }).click();
  await ledgers.first().click();
  await page.getByRole("listitem").filter({ hasText: /^Cash in Hand \(/ }).click();
  await page.getByRole("spinbutton", { name: "Debit" }).first().fill("250");
  await page.getByRole("spinbutton", { name: "Credit" }).nth(1).fill("250");
  await page.getByRole("textbox", { name: "Narration" }).fill(narration);
  const saved = page.waitForResponse(res => res.url().endsWith("/api/accounting/vouchers") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Save voucher" }).click();
  const voucher = (await (await saved).json()).data;
  expect(voucher.voucher_no).toMatch(/^PV-/);

  try {
    await expect(page.getByRole("row").filter({ hasText: narration })).toBeVisible();

    // It is in the daybook with Rent debited and cash credited.
    const day = (await books.get(`/accounting/daybook?from=${today()}&to=${today()}`)).body.data;
    const entry = day.find(row => row.id === voucher.id);
    expect(entry.lines.map(line => [line.account, line.debit, line.credit])).toEqual([["Rent", 250, 0], ["Cash in Hand", 0, 250]]);

    // The books still balance.
    await page.goto("/finance/trial-balance");
    const totals = page.getByRole("row").filter({ hasText: /^Total/ });
    await expect(totals).toBeVisible();
    const cells = await totals.getByRole("cell").allInnerTexts();
    expect(cells.at(-1)).toBe(cells.at(-2));

    await page.goto("/finance/balance-sheet");
    await expect(page.getByText("Closing Stock (FIFO cost)")).toBeVisible();
    await expect(page.getByText(/Assets and liabilities differ/)).toHaveCount(0);
  } finally {
    // Remove it through the screen, as a user would.
    await page.goto("/finance/voucher-entry");
    await page.getByRole("button", { name: `Delete ${voucher.voucher_no}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: narration })).toHaveCount(0);
    await close();
  }
});

test("an unbalanced voucher cannot be saved", async ({ browser }) => {
  const { page, close } = await asUser(browser, "manager");
  await page.goto("/finance/voucher-entry");
  await page.getByRole("button", { name: "Journal" }).click();
  const ledgers = page.getByText("Choose ledger");
  await ledgers.first().click();
  await page.getByRole("listitem").filter({ hasText: /^Rent \(/ }).click();
  await ledgers.first().click();
  await page.getByRole("listitem").filter({ hasText: /^Cash in Hand \(/ }).click();
  await page.getByRole("spinbutton", { name: "Debit" }).first().fill("100");
  await page.getByRole("spinbutton", { name: "Credit" }).nth(1).fill("90");
  await expect(page.getByText(/Debits and credits differ by 10\.00/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save voucher" })).toBeDisabled();
  await close();
});
