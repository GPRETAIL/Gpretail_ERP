import React from "react";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { MetricCard } from "@/features/dashboard/components/DashboardStatCards";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Four separate widgets (not one bundled grid) so DashboardGrid can drag/resize each KPI card
// independently in the Overview tab's layout customizer, instead of moving the whole row at once.

export function TotalBillsCard({ totalBills = {}, loading, privacyMode }) {
  return (
    <MetricCard
      eyebrow="Total Bills"
      title="Total bill amount"
      value={loading ? <LoadingSkeleton /> : formatMoney(totalBills.amount)}
      subtitle={loading ? <LoadingSkeleton /> : `${totalBills.count || 0} Bills (${totalBills.unsettledCount || 0} UNSETTLED)`}
      trend={totalBills.trend}
      privacyMode={privacyMode}
    />
  );
}

export function SettlementCard({ settlements = {}, loading, privacyMode }) {
  return (
    <MetricCard
      eyebrow="Settlement"
      title="Settled invoice amount"
      value={loading ? <LoadingSkeleton /> : formatMoney(settlements.amount)}
      subtitle={loading ? <LoadingSkeleton /> : `Outstanding: ${formatMoney(settlements.unsettledAmount)} (${settlements.unsettledCount || 0} unsettled bills)`}
      trend={settlements.trend}
      privacyMode={privacyMode}
    />
  );
}

export function EmployeesCard({ employees = {}, loading, privacyMode }) {
  return (
    <MetricCard
      eyebrow="Employees"
      value={loading ? <LoadingSkeleton /> : `${employees.present || 0}/${employees.total || 0}`}
      valueSubheading="Present today / active employees"
      trend={employees.trend}
      subtitle="Active employee count"
      privacyMode={privacyMode}
    />
  );
}

export function StockValueCard({ stockValue = {}, loading, privacyMode }) {
  return (
    <MetricCard
      eyebrow="Stock value"
      title="Current stock value"
      value={loading ? <LoadingSkeleton /> : formatMoney(stockValue.amount)}
      trend={stockValue.trend}
      privacyMode={privacyMode}
    />
  );
}
