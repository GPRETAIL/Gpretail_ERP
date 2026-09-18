import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { severityTileSx } from "../../../utils/dashboardFormatters";

export default function SalesActionRequiredBanner({ actionRequired = [], loading }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid",
        borderColor: "warning.main",
        bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
        p: 2,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "warning.main", display: "inline-flex" }}>
            <AlertOctagon className="h-5 w-5" />
          </Box>
          <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Action Required (Attention Needed)
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
          Click any card to open the filtered workflow
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid", gap: 1.5,
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" },
        }}
      >
        {actionRequired.map((item) => (
          <ButtonBase
            key={item.key}
            onClick={() => navigate(`${item.route}?${item.filter_param}`)}
            sx={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between",
              borderRadius: "8.75px", border: "1px solid", p: 1.5, textAlign: "left",
              transition: "transform 0.15s ease", "&:hover": { transform: "scale(1.02)" },
              ...severityTileSx(item.severity),
            }}
          >
            <Typography sx={{ fontSize: 17.5, fontWeight: 800, color: "text.primary" }}>
              {loading ? "..." : item.count}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{item.label}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
