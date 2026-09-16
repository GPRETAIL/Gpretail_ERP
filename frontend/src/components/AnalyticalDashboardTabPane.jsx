import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import AnalyticalKpiSummary from "./dashboard/analytical/AnalyticalKpiSummary";
import AnalyticalDataQualityBanner from "./dashboard/analytical/AnalyticalDataQualityBanner";
import AnalyticalInsightsPanel from "./dashboard/analytical/AnalyticalInsightsPanel";
import AnalyticalLaunchpad from "./dashboard/analytical/AnalyticalLaunchpad";

export default function AnalyticalDashboardTabPane({ active, fromDate, toDate, companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!active) return;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/analytical/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load analytical data.");
      }
    } catch (err) {
      console.error("Analytical Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const dataQuality = data?.data_quality || [];
  const insights = data?.insights || {};
  const quickLinks = data?.quick_links || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-summary",
        title: "KPI Summary",
        component: AnalyticalKpiSummary,
        props: { summary, loading },
        defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "data-quality",
        title: "Analytics Data Quality",
        component: AnalyticalDataQualityBanner,
        props: { dataQuality, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "insights",
        title: "Cross-Module Insights",
        component: AnalyticalInsightsPanel,
        props: { insights, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "launchpad",
        title: "Analytics Launchpad",
        component: AnalyticalLaunchpad,
        props: { quickLinks },
        defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, dataQuality, insights, quickLinks]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardGrid tabKey="analytical" widgets={widgets} />
    </div>
  );
}
