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

const REPORTS = [
  { title: "Sales Report", sub: "View sales reports", icon: BarChart3, bg: "bg-emerald-500" },
  { title: "Purchase Report", sub: "View purchase reports", icon: ClipboardList, bg: "bg-rose-500" },
  { title: "Stock Report", sub: "View stock reports", icon: Box, bg: "bg-blue-500" },
  { title: "Profit & Loss", sub: "View profit & loss reports", icon: TrendingUp, bg: "bg-indigo-500" },
  { title: "GST Report", sub: "View GST reports", icon: FileText, bg: "bg-purple-500" },
  { title: "Receivables Report", sub: "View receivables reports", icon: Wallet, bg: "bg-cyan-500" },
];

/**
 * Reports navigation screen.
 */
export default function ReportsScreen() {
  return (
    <div className="space-y-2">
      {REPORTS.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="vx-menu-row">
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
