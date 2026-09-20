import React from "react";
import { Box, Typography } from "@mui/material";

const DashboardPlaceholder = ({ title, description }) => (
  <Box sx={{ borderRadius: "5.25px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 4, textAlign: "center" }}>
    <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
    <Typography sx={{ mt: 1, fontSize: 14, color: "text.secondary" }}>{description}</Typography>
  </Box>
);

export default DashboardPlaceholder;
