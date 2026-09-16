import React from "react";
import { MetricCard } from "../../DashboardStatCards";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Four separate widgets (not one bundled grid) so DashboardGrid can drag/resize each KPI card
// independently in the Overview tab's layout customizer, instead of moving the whole row at once.

export function TotalBillsCard({ totalBills = {}, loading }) {
  return (
    <MetricCard
      eyebrow="Total Bills"
      title="Total bill amount"
      value={loading ? "..." : formatMoney(totalBills.amount)}
      subtitle={loading ? "..." : `${totalBills.count || 0} Bills (${totalBills.unsettledCount || 0} UNSETTLED)`}
      trend={totalBills.trend}
    />
  );
}

export function SettlementCard({ settlements = {}, loading }) {
  return (
    <MetricCard
      eyebrow="Settlement"
      title="Total settlement amount"
      value={loading ? "..." : formatMoney(settlements.amount)}
      trend={settlements.trend}
    />
  );
}

export function EmployeesCard({ employees = {}, loading }) {
  return (
    <MetricCard
      eyebrow="Employees"
      value={loading ? "..." : `${employees.present || 0}/${employees.total || 0}`}
      valueSubheading="Present / total"
    />
  );
}

export function StockValueCard({ stockValue = {}, loading }) {
  return (
    <MetricCard
      eyebrow="Stock value"
      title="Total stock value"
      value={loading ? "..." : formatMoney(stockValue.amount)}
      trend={stockValue.trend}
    />
  );
}
