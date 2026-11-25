import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import BillingShortcutsHelp from "@/features/sales/pos/components/BillingShortcutsHelp";
import { BILLING_SHORTCUTS } from "@/features/sales/pos/utils/billingShortcuts";
import { parseQuantityShortcut } from "@/features/sales/pos/utils/quantityShortcut";

afterEach(cleanup);

it("keeps the shortcuts behind a small i button, and lists them when it is pressed", () => {
  render(<BillingShortcutsHelp />);
  expect(screen.queryByText("Type in the barcode box")).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Billing shortcuts" });
  expect(button).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(button);
  const list = screen.getByRole("dialog", { name: "Billing shortcuts" });
  expect(within(list).getByText("Type in the barcode box")).toBeInTheDocument();
  expect(within(list).getByText("*10+2")).toBeInTheDocument();
  expect(within(list).getByText("Holds this bill so the next customer can be served.")).toBeInTheDocument();
  expect(within(list).getByText("Saves the bill and prints it.")).toBeInTheDocument();
  expect(button).toHaveAttribute("aria-expanded", "true");
});

it("every quantity example it shows really is a shortcut the box understands", () => {
  const quantity = BILLING_SHORTCUTS.flatMap((row) => row.keys).filter((key) => /^(\d+\*|\*\d)/.test(key));
  quantity.forEach((key) => expect(parseQuantityShortcut(key), key).not.toBeNull());
});
