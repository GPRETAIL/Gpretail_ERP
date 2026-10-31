import { expect, test } from "@playwright/test";
import { OTHER_STORE_ID, USERS, api, asUser, password } from "./support/session";

test("a wrong password is refused with a message", async ({ page }) => {
  // No correct sign-in afterwards: it would replace the cashier session the other specs reuse.
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(USERS.cashier);
  await page.getByRole("textbox", { name: "Password" }).fill(`${password()}-wrong`);
  await page.getByRole("textbox", { name: "Password" }).press("Enter");
  await expect(page.getByText(/Invalid username or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a cashier cannot open the books, in the menu or through the API", async ({ browser, request }) => {
  const { page, token, close } = await asUser(browser, "cashier");

  await page.goto("/finance/trial-balance");
  await expect(page).not.toHaveURL(/\/finance\/trial-balance/); // Bounced to the cashier's home page.

  const cashier = api(request, token);
  expect((await cashier.get("/accounting/trial-balance")).status).toBe(403);
  expect((await cashier.post("/accounting/vouchers", { voucher_type: "journal", voucher_date: "2026-01-01", lines: [] })).status).toBe(403);
  await close();
});

test("a store user cannot read or write another store's data", async ({ browser, request }) => {
  const { token, close } = await asUser(browser, "manager");
  const otherStore = api(request, token, OTHER_STORE_ID);

  const read = await otherStore.get("/pos-sales?limit=5");
  expect(read.status).toBe(403);
  expect(read.body?.code).toBe("STORE_ACCESS_DENIED");
  expect((await otherStore.get("/accounting/accounts")).status).toBe(403);
  expect((await otherStore.post("/accounting/vouchers", { voucher_type: "journal", voucher_date: "2026-01-01", lines: [] })).status).toBe(403);
  await close();
});

test("the API refuses requests without a session", async ({ request }) => {
  for (const path of ["/pos-sales", "/accounting/trial-balance", "/user-access", "/suppliers"]) {
    const res = await request.get(`/api${path}`, { headers: { Accept: "application/json" } });
    expect(res.status(), path).toBe(401);
  }
});
