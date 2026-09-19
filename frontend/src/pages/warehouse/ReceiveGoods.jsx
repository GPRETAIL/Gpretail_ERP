import React, { useState } from "react";
import { ArrowLeft, Search, User } from "lucide-react";
import { Box, Stack, Typography, TextField, IconButton, alpha } from "@mui/material";

const ReceiveGoods = () => {
  const [packageCode, setPackageCode] = useState("");
  const [statusMessage, setStatusMessage] = useState({
    type: "info",
    message: "Scan or enter the package code to receive goods.",
  });

  const handleCodeChange = (e) => {
    setPackageCode(e.target.value);
  };

  const handleSearch = () => {
    if (!packageCode.trim()) {
      setStatusMessage({
        type: "error",
        message: "Please enter a package code.",
      });
      return;
    }

    // Simulate API call to check/receive the package
    console.log("Processing Package Code:", packageCode);

    // Mock response based on the code
    if (packageCode.toLowerCase().includes("fail")) {
      setStatusMessage({
        type: "error",
        message: `Package ${packageCode} not found or already received.`,
      });
    } else {
      setStatusMessage({
        type: "success",
        message: `Package ${packageCode} successfully received and processed.`,
      });
    }
    setPackageCode(""); // Clear input for next scan
  };

  const handleBackClick = () => {
    // navigate(-1); // Use for actual routing
    console.log("Navigating back...");
  };

  // Determine message styling
  const statusToneSx = {
    info: (theme) => ({
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.1),
      color: "primary.main",
    }),
    success: (theme) => ({
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.1),
      color: "success.main",
    }),
    error: (theme) => ({
      bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.1),
      color: "error.main",
    }),
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* --- Header --- */}
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: 1,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={handleBackClick} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>
            Warehouse / Receive Goods
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 12.25, color: "text.secondary" }}>
          <User className="w-5 h-5" />
          <Typography component="span" sx={{ fontSize: 12.25, fontWeight: 500 }}>
            User: Admin
          </Typography>
        </Stack>
      </Stack>

      {/* --- Main Content Area (Input/Search) --- */}
      <Box sx={{ flex: 1, p: 4 }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 672,
            mx: "auto",
            bgcolor: "background.paper",
            p: 3,
            borderRadius: "7px",
            boxShadow: 4,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 600, color: "text.secondary", mb: 1 }}>
            Package code
          </Typography>
          <Stack direction="row">
            <TextField
              value={packageCode}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Scan or enter package code..."
              autoFocus
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 0, borderTopLeftRadius: "5.25px", borderBottomLeftRadius: "5.25px" },
                "& .MuiInputBase-input": { fontSize: 17.5, py: 1 },
              }}
            />
            <IconButton
              onClick={handleSearch}
              className="glass-btn glass-btn-primary"
              aria-label="Search Package Code"
              sx={{ borderRadius: 0, borderTopRightRadius: "5.25px", borderBottomRightRadius: "5.25px" }}
            >
              <Search className="w-5 h-5" />
            </IconButton>
          </Stack>

          {/* Status Message Area */}
          <Box
            sx={[
              { mt: 3, p: 2, borderRadius: "5.25px", fontWeight: 500 },
              statusToneSx[statusMessage.type],
            ]}
          >
            {statusMessage.message}
          </Box>

          {/* Placeholder for scanned item details to appear below */}
          <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
              Scanned Item Details:
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ fontSize: 12.25, color: "text.secondary", mt: 1, pl: 2.5 }}>
              <li>**Invoice No:** (Appears after successful scan)</li>
              <li>**Supplier:** (Appears after successful scan)</li>
              <li>**Total Pieces:** (Appears after successful scan)</li>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* --- Global Footer Bar --- */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          justifyContent: "flex-end",
          p: 1.5,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          zIndex: 10,
        }}
      >
        <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary", alignSelf: "center" }}>
          Customer Care **+91 93840 30115 / 6 / 7**
        </Typography>
      </Stack>
    </Box>
  );
};

export default ReceiveGoods;
