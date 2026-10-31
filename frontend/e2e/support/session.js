import { expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

/**
 * Users of the disposable test store. Usernames default to the local test store's; the password is
 * never stored in the repository and must come from the environment.
 */
export const USERS = {
  cashier: process.env.E2E_CASHIER || "testcashier",
  manager: process.env.E2E_MANAGER || "testmanager",
};
export const STORE_ID = Number(process.env.E2E_STORE_ID || 2);
/** A store the test users are NOT assigned to, for the isolation checks. */
export const OTHER_STORE_ID = Number(process.env.E2E_OTHER_STORE_ID || 1);
/** A unit barcode with stock in the test store. */
export const BARCODE = process.env.E2E_BARCODE || "TEST-SHIRT";

export function password() {
  const value = process.env.E2E_PASSWORD;
  if (!value) throw new Error("Set E2E_PASSWORD to the test store users' password (see e2e/README.md).");
  return value;
}

/** Signs in through the login page and returns the session's API token. */
export async function signIn(page, role) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(USERS[role]);
  await page.getByRole("textbox", { name: "Password" }).fill(password());
  await page.getByRole("textbox", { name: "Password" }).press("Enter");
  await expect(page).not.toHaveURL(/\/login/);
  return page.evaluate(() => localStorage.getItem("token"));
}

export const authFile = role => fileURLToPath(new URL(`../.auth/${role}.json`, import.meta.url));

/** A page signed in as the role (session saved by auth.setup.js), and that session's API token. */
export async function asUser(browser, role) {
  const context = await browser.newContext({ storageState: authFile(role) });
  const page = await context.newPage();
  await page.goto("/modules");
  const token = await page.evaluate(() => localStorage.getItem("token"));
  return { page, token, close: () => context.close() };
}

/**
 * API calls as the signed-in browser session (the same token, so the browser stays signed in;
 * a fresh API login would revoke the browser's session).
 */
export function api(request, token, storeId = STORE_ID) {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "X-Company-Scope-Id": String(storeId) };
  const call = async (method, path, data) => {
    const res = await request.fetch(`/api${path}`, { method, headers, data });
    let body = null;
    try { body = await res.json(); } catch { /* Not JSON. */ }
    return { status: res.status(), body };
  };
  return {
    get: path => call("GET", path),
    post: (path, data) => call("POST", path, data),
    put: (path, data) => call("PUT", path, data),
    delete: path => call("DELETE", path),
  };
}

export const today = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
