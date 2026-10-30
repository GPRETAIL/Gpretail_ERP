import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EmployeesCard, StockValueCard, SettlementCard, TotalBillsCard } from "./OverviewKpiGrid";

it("shows the real unsettled bill count and separates settled invoices from outstanding amounts", () => {
  render(<><TotalBillsCard totalBills={{ amount: 2000, count: 20, unsettledCount: 2 }} /><SettlementCard settlements={{ amount: 1900, unsettledAmount: 100, unsettledCount: 2 }} /></>);
  expect(screen.getByText("20 Bills (2 UNSETTLED)")).toBeVisible();
  expect(screen.getByText("1,900.00")).toBeVisible();
  expect(screen.getByText("Outstanding: 100.00 (2 unsettled bills)")).toBeVisible();
});

it("shows employee headcount and stock-value comparisons using the shared trend style", () => {
  render(<><EmployeesCard employees={{ present: 0, total: 2, trend: { direction: "up", changePercent: 100, label: "vs last month (recorded)" } }} />
    <StockValueCard stockValue={{ amount: 150, trend: { direction: "down", changePercent: 25, label: "vs last month (recorded)" } }} /></>);
  expect(screen.getByText("0/2")).toBeVisible();
  expect(screen.getByText("Present today / active employees")).toBeVisible();
  expect(screen.getByText("100% vs last month (recorded)")).toBeVisible();
  expect(screen.getByText("25% vs last month (recorded)")).toBeVisible();
});

it("shows unavailable history without inventing a percentage", () => {
  render(<StockValueCard stockValue={{ amount: 150, trend: { direction: "unavailable", changePercent: null, message: "Last-month snapshot unavailable" } }} />);
  expect(screen.getByText("Last-month snapshot unavailable")).toBeVisible();
  expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
});

it("does not describe growth from zero as 100 percent", () => {
  render(<TotalBillsCard totalBills={{ amount: 150, trend: { direction: "new", changePercent: null, message: "No percentage baseline (previous value 0)" } }} />);
  expect(screen.getByText("No percentage baseline (previous value 0)")).toBeVisible();
  expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
});

it("uses the actual comparison period for flat values", () => {
  render(<TotalBillsCard totalBills={{ trend: { direction: "flat", changePercent: 0, label: "vs previous period" } }} />);
  expect(screen.getByText("No change vs previous period")).toBeVisible();
});
