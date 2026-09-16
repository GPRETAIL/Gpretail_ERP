import React from "react";
import { MetricCard } from "../../DashboardStatCards";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function OverviewKpiGrid({ totalBills = {}, settlements = {}, employees = {}, stockValue = {}, loading }) {
  return (
    <div className="grid h-full grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        eyebrow="Total Bills"
        title="Total bill amount"
        value={loading ? "..." : formatMoney(totalBills.amount)}
        subtitle={loading ? "..." : `${totalBills.count || 0} Bills (${totalBills.unsettledCount || 0} UNSETTLED)`}
        trend={totalBills.trend}
      />
      <MetricCard
        eyebrow="Settlement"
        title="Total settlement amount"
        value={loading ? "..." : formatMoney(settlements.amount)}
        trend={settlements.trend}
      />
      <MetricCard
        eyebrow="Employees"
        value={loading ? "..." : `${employees.present || 0}/${employees.total || 0}`}
        valueSubheading="Present / total"
      />
      <MetricCard
        eyebrow="Stock value"
        title="Total stock value"
        value={loading ? "..." : formatMoney(stockValue.amount)}
        trend={stockValue.trend}
      />
    </div>
  );
}
