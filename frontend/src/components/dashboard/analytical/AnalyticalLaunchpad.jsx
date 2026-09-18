import React from "react";
import { useNavigate } from "react-router-dom";
import { Compass, ArrowRight } from "lucide-react";
import { alpha } from "@mui/material/styles";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";

export default function AnalyticalLaunchpad({ quickLinks = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Compass className="h-4 w-4" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Analytics Launchpad</Typography>
      </Stack>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(2, minmax(0, 1fr))" } }}>
        {quickLinks.map((link) => (
          <ButtonBase
            key={link.path}
            onClick={() => navigate(link.path)}
            className="group"
            sx={{
              justifyContent: "space-between", borderRadius: "7px", border: "1px solid", borderColor: "divider",
              bgcolor: "action.hover", px: 1.5, py: 1.25, textAlign: "left",
              "&:hover": { borderColor: "primary.light", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) },
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary" }}>{link.label}</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{link.description}</Typography>
            </Box>
            <Box
              sx={{
                color: "text.disabled", display: "inline-flex", transition: "transform 0.2s, color 0.2s",
                ".group:hover &": { transform: "translateX(2px)", color: "primary.main" },
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Box>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
