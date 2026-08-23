import React from "react";
import {
  BarChart3,
  ClipboardList,
  Box,
  TrendingUp,
  FileText,
  Wallet,
  ChevronRight,
} from "lucide-react";

// Sales/Purchase/Stock reuse the existing, already-real mobile screens for
// those areas rather than duplicating a second view of the same data.
// Profit & Loss/GST/Receivables have no dedicated mobile screen yet, so they
// route to the shared ReportDetailScreen with the relevant report type.
const REPORTS = [
  { title: "Sales Report", sub: "View sales reports", icon: BarChart3, bg: "bg-emerald-500", target: "sales" },
  { title: "Purchase Report", sub: "View purchase reports", icon: ClipboardList, bg: "bg-rose-500", target: "purchase" },
  { title: "Stock Report", sub: "View stock reports", icon: Box, bg: "bg-blue-500", target: "inventory" },
  { title: "Profit & Loss", sub: "View profit & loss reports", icon: TrendingUp, bg: "bg-indigo-500", target: "report_profit_loss" },
  { title: "GST Report", sub: "View GST reports", icon: FileText, bg: "bg-purple-500", target: "report_gst" },
  { title: "Receivables Report", sub: "View receivables reports", icon: Wallet, bg: "bg-cyan-500", target: "report_receivables" },
];

/**
 * Reports navigation screen.
 */
export default function ReportsScreen({ onNavigate }) {
  return (
    <div className="space-y-2">
      {REPORTS.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="vx-menu-row cursor-pointer active:bg-slate-50 transition-all"
            onClick={() => onNavigate && onNavigate(item.target)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onNavigate) onNavigate(item.target);
            }}
          >
            <div className="vx-menu-row-left">
              <div className={`vx-menu-icon-box ${item.bg}`}>
                <Icon size={20} />
              </div>
              <div className="vx-menu-row-text">
                <h4>{item.title}</h4>
                <p>{item.sub}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>
        );
      })}
    </div>
  );
}
