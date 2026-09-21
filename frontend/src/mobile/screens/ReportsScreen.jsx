import React from "react";
import {
  BarChart3,
  ClipboardList,
  Box as BoxIcon,
  TrendingUp,
  FileText,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { Box, Typography } from "@mui/material";

// Sales/Purchase/Stock reuse the existing, already-real mobile screens for
// those areas rather than duplicating a second view of the same data.
// Profit & Loss/GST/Receivables have no dedicated mobile screen yet, so they
// route to the shared ReportDetailScreen with the relevant report type.
const REPORTS = [
  { title: "Sales Report", sub: "View sales reports", icon: BarChart3, bg: "bg-emerald-500", target: "sales" },
  { title: "Purchase Report", sub: "View purchase reports", icon: ClipboardList, bg: "bg-rose-500", target: "purchase" },
  { title: "Stock Report", sub: "View stock reports", icon: BoxIcon, bg: "bg-blue-500", target: "inventory" },
  { title: "Profit & Loss", sub: "View profit & loss reports", icon: TrendingUp, bg: "bg-indigo-500", target: "report_profit_loss" },
  { title: "GST Report", sub: "View GST reports", icon: FileText, bg: "bg-purple-500", target: "report_gst" },
  { title: "Receivables Report", sub: "View receivables reports", icon: Wallet, bg: "bg-cyan-500", target: "report_receivables" },
];

/**
 * Reports navigation screen.
 */
export default function ReportsScreen({ onNavigate }) {
  return (
    <Box className="space-y-2">
      {REPORTS.map((item, i) => {
        const Icon = item.icon;
        return (
          <Box
            key={i}
            className="vx-menu-row"
            onClick={() => onNavigate && onNavigate(item.target)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onNavigate) onNavigate(item.target);
            }}
          >
            <Box className="vx-menu-row-left">
              <Box className={`vx-menu-icon-box ${item.bg}`}>
                <Icon size={20} />
              </Box>
              <Box className="vx-menu-row-text">
                <Typography component="h4">{item.title}</Typography>
                <Typography component="p">{item.sub}</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} color="#94a3b8" />
          </Box>
        );
      })}
    </Box>
  );
}
