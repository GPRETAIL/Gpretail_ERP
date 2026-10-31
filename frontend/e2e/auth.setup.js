import { test as setup } from "@playwright/test";
import { authFile, signIn } from "./support/session";

// Sign in once per role and reuse the saved session in every spec: the login route allows only a
// few attempts a minute per address, and a fresh API login would revoke the browser's session.
for (const role of ["cashier", "manager"]) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await signIn(page, role);
    await page.context().storageState({ path: authFile(role) });
  });
}
