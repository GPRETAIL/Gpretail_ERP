import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

// Shared by Overview's KPI row and every module tab's stat-card grid, so a "Sales growth 4.2%"
// badge looks identical whether it's driven by vx-sales metrics or a module's dashboard-summary.
export const TrendBadge = ({ trend }) => {
  if (!trend || trend.direction === "flat") {
    return <p className="text-[10px] leading-tight text-slate-500 dark:text-gray-400 mt-1">No change from last month</p>;
  }

  const isUp = trend.direction === "up";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const colorClass = isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

  return (
    <p className={`text-[10px] leading-tight mt-1 inline-flex items-center gap-1 ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{trend.changePercent}% from last month</span>
    </p>
  );
};

export const MetricCard = ({ eyebrow, title, value, valueSubheading, subtitle, trend }) => (
  <div className="flex h-[118px] flex-col rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
    <p className="text-[11px] leading-tight text-slate-500 dark:text-gray-400">{eyebrow}</p>
    {title ? <p className="mt-0.5 text-xs leading-tight font-medium text-slate-700 dark:text-gray-300">{title}</p> : null}
    <p className="mt-0.5 text-base leading-tight font-semibold text-slate-900 dark:text-gray-100">{value}</p>
    {valueSubheading ? (
      <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-gray-400">{valueSubheading}</p>
    ) : null}
    <div className="mt-auto space-y-0.5">
      <p className="min-h-[14px] text-[11px] leading-tight text-slate-600 dark:text-gray-400">{subtitle || " "}</p>
      <div className="min-h-[16px]">
        {trend ? (
          <TrendBadge trend={trend} />
        ) : (
          <p className="text-[10px] leading-tight invisible">0% from last month</p>
        )}
      </div>
    </div>
  </div>
);

// A row of MetricCards driven by a plain {label, value}[] list -- what every module tab's
// dashboard-summary endpoint reduces to once formatted. Kept deliberately dumb (no fetching, no
// per-module knowledge) so it's equally usable for a 2-field CRM summary or a 6-field Masters one.
const ModuleStatCards = ({ cards, loading }) => (
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map((card) => (
      <MetricCard
        key={card.label}
        eyebrow={card.label}
        value={loading ? "..." : card.value}
        subtitle={card.subtitle}
        trend={card.trend}
      />
    ))}
  </div>
);

export default ModuleStatCards;
