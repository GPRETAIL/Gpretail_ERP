import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import QuickNavigation from "@/shared/layout/QuickNavigation";
import { buildQuickNavGroups, filterQuickNavGroups } from "@/shared/layout/quickNavGroups";

afterEach(cleanup);

const items = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Sales", subItems: [{ name: "POS Sales", path: "/sales/pos" }, { name: "Bill Reprint", path: "/sales/bill-reprint" }] },
  { name: "Warehouse", subItems: [{ name: "Barcode", path: "/warehouse/barcode" }] },
  { name: "Empty", subItems: [] },
];

it("groups pages by module, with single pages under General and empty modules left out", () => {
  const groups = buildQuickNavGroups(items);
  expect(groups.map((group) => group.name)).toEqual(["General", "Sales", "Warehouse"]);
  expect(groups[1].pages.map((page) => page.path)).toEqual(["/sales/pos", "/sales/bill-reprint"]);
});

it("searches page names, or a module name to show all of its pages", () => {
  const groups = buildQuickNavGroups(items);
  expect(filterQuickNavGroups(groups, "reprint").flatMap((group) => group.pages.map((page) => page.name))).toEqual(["Bill Reprint"]);
  expect(filterQuickNavGroups(groups, "warehouse")[0].pages).toHaveLength(1);
  expect(filterQuickNavGroups(groups, "sales pos").flatMap((group) => group.pages.map((page) => page.name))).toEqual(["POS Sales"]);
  expect(filterQuickNavGroups(groups, "zzz")).toEqual([]);
});

it("opens from the header button, goes to the page that was clicked and closes", () => {
  const onNavigate = vi.fn();
  render(<QuickNavigation items={items} onNavigate={onNavigate} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quick navigation" }));
  fireEvent.click(screen.getByRole("button", { name: "Bill Reprint" }));
  expect(onNavigate).toHaveBeenCalledWith("/sales/bill-reprint");
});

it("Enter opens the first match and Ctrl+K opens the panel", () => {
  const onNavigate = vi.fn();
  render(<QuickNavigation items={items} onNavigate={onNavigate} />);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const search = screen.getByRole("textbox", { name: "Search modules and pages" });
  fireEvent.change(search, { target: { value: "barcode" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onNavigate).toHaveBeenCalledWith("/warehouse/barcode");
});

it("says so when nothing matches", () => {
  render(<QuickNavigation items={items} onNavigate={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Quick navigation" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search modules and pages" }), { target: { value: "zzz" } });
  expect(screen.getByText(/No page matches "zzz"/)).toBeVisible();
});
