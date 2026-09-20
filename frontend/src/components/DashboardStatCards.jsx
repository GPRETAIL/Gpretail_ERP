import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Box, Typography } from "@mui/material";

// Shared by Overview's KPI row and every module tab's stat-card grid, so a "Sales growth 4.2%"
// badge looks identical whether it's driven by vx-sales metrics or a module's dashboard-summary.
export const TrendBadge = ({ trend }) => {
  if (!trend || trend.direction === "flat") {
    return (
      <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: "text.secondary", mt: 0.5 }}>
        No change from last month
      </Typography>
    );
  }

  const isUp = trend.direction === "up";
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <Typography
      component="p"
      sx={{
        fontSize: 10, lineHeight: 1.2, mt: 0.5, display: "inline-flex", alignItems: "center", gap: 0.5,
        color: isUp ? "success.main" : "error.main",
      }}
    >
      <Icon size={12} />
      <Box component="span">{trend.changePercent}% from last month</Box>
    </Typography>
  );
};

export const MetricCard = ({ eyebrow, title, value, valueSubheading, subtitle, trend, privacyMode }) => {
  // Only the figures blur -- eyebrow/title labels stay legible so the card is still
  // identifiable at a glance, just with the actual numbers hidden for screen-sharing.
  const blurSx = privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {};
  return (
    <Box
      sx={{
        display: "flex", height: "100%", minHeight: 118, flexDirection: "column",
        borderRadius: "5.25px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", px: 1.5, py: 1,
      }}
    >
      <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: "text.secondary" }}>{eyebrow}</Typography>
      {title ? (
        <Typography sx={{ mt: 0.25, fontSize: 12, lineHeight: 1.2, fontWeight: 500, color: "text.primary" }}>
          {title}
        </Typography>
      ) : null}
      <Typography sx={{ mt: 0.25, fontSize: 16, lineHeight: 1.2, fontWeight: 600, color: "text.primary", ...blurSx }}>
        {value}
      </Typography>
      {valueSubheading ? (
        <Typography sx={{ mt: 0.25, fontSize: 11, lineHeight: 1.2, color: "text.secondary" }}>
          {valueSubheading}
        </Typography>
      ) : null}
      <Box sx={{ mt: "auto", "& > * + *": { mt: 0.25 } }}>
        <Typography sx={{ minHeight: 14, fontSize: 11, lineHeight: 1.2, color: "text.secondary", ...blurSx }}>
          {subtitle || " "}
        </Typography>
        <Box sx={{ minHeight: 16 }}>
          {trend ? (
            <TrendBadge trend={trend} />
          ) : (
            <Typography sx={{ fontSize: 10, lineHeight: 1.2, visibility: "hidden" }}>0% from last month</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// A row of MetricCards driven by a plain {label, value}[] list -- what every module tab's
// dashboard-summary endpoint reduces to once formatted. Kept deliberately dumb (no fetching, no
// per-module knowledge) so it's equally usable for a 2-field CRM summary or a 6-field Masters one.
const ModuleStatCards = ({ cards, loading }) => (
  <Box
    sx={{
      display: "grid", gap: 1.25,
      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
    }}
  >
    {cards.map((card) => (
      <MetricCard
        key={card.label}
        eyebrow={card.label}
        value={loading ? "..." : card.value}
        subtitle={card.subtitle}
        trend={card.trend}
      />
    ))}
  </Box>
);

export default ModuleStatCards;
