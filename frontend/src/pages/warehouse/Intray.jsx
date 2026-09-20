import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, alpha } from "@mui/material";

// Mock data structure for the list
const mockEntries = [
  {
    date: "01-11-2025",
    type: "Invoice",
    description: "Inv-2025/1001",
    createdBy: "Admin",
    actionBy: "Manager",
    status: "Pending",
  },
  {
    date: "02-11-2025",
    type: "PO",
    description: "PO-2025/505",
    createdBy: "User1",
    actionBy: "Director",
    status: "Open",
  },
  {
    date: "03-11-2025",
    type: "Delivery Note",
    description: "DN-0045",
    createdBy: "Store",
    actionBy: "Manager",
    status: "Approved",
  },
];

const Intray = () => {
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [entries, setEntries] = useState(mockEntries);
  const [filters, setFilters] = useState({
    type: "ALL",
    company: "",
    status: "Open",
    date: "",
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const navigate = useNavigate();
  const handleBackClick = () => {
    navigate(-1);
  };

  const handleSearch = () => {
    // In a real application, this would fetch data from an API based on filters
    console.log("Searching with filters:", filters);
    // For demonstration, we'll just filter the mock data
    const results = mockEntries.filter((entry) => {
      const typeMatch = filters.type === "ALL" || entry.type === filters.type;
      const statusMatch =
        filters.status === "" || entry.status === filters.status;
      // Add more complex filtering logic here for date, company, etc.
      return typeMatch && statusMatch;
    });
    setEntries(results);
  };

  // Mock options for select fields
  const typeOptions = [
    { value: "ALL", label: "ALL" },
    { value: "Invoice", label: "Invoice" },
    { value: "PO", label: "Purchase Order" },
    { value: "Delivery Note", label: "Delivery Note" },
  ];

  const statusOptions = [
    { value: "Open", label: "Open" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* --- Header Section --- */}
      <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <IconButton aria-label="Back" onClick={handleBackClick} sx={{ mr: 1.5, color: "text.secondary" }}>
          <ArrowLeft size={16} />
        </IconButton>
        <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600 }}>
          Intray
          <Box component="span" sx={{ fontSize: 12.25, fontWeight: 400, color: "text.secondary", ml: 1 }}>
            | {entries.length} Entries
          </Box>
        </Typography>
      </Stack>

      {/* --- Filters Section --- */}
      <Box sx={{ p: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "flex-end" }}>
          {/* Type Filter */}
          <Box sx={{ flex: 1, maxWidth: 200 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
              Type
            </Typography>
            <TextField select name="type" value={filters.type} onChange={handleFilterChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Company Filter */}
          <Box sx={{ flex: 1, maxWidth: 200 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
              Company
            </Typography>
            <TextField select name="company" value={filters.company} onChange={handleFilterChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
              {companyOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Status Filter */}
          <Box sx={{ flex: 1, maxWidth: 200 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
              Status
            </Typography>
            <TextField select name="status" value={filters.status} onChange={handleFilterChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Date Filter (as date range or single date) */}
          <Box sx={{ flex: 1, maxWidth: 200 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
              Date
            </Typography>
            <TextField type="date" name="date" value={filters.date} onChange={handleFilterChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
          </Box>

          {/* Search Button */}
          <Button onClick={handleSearch} className="glass-btn glass-btn-primary" startIcon={<Search size={16} />}>
            Search
          </Button>
        </Stack>
      </Box>

      {/* --- Results Table --- */}
      <Box sx={{ p: 2, overflowX: "auto" }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px" }}>
          {/* Table Header Row (Blue background) */}
          <Stack
            direction="row"
            sx={(theme) => ({
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
              fontSize: 10.5,
              fontWeight: 600,
              color: "text.secondary",
            })}
          >
            {/* These input-style placeholders in the image suggest inline column filtering */}
            <Box
              component="input"
              type="text"
              placeholder="Date"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%", bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              component="input"
              type="text"
              placeholder="Type"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%", bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              component="input"
              type="text"
              placeholder="Description"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1, bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              component="input"
              type="text"
              placeholder="Created By"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "16.66%", bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              component="input"
              type="text"
              placeholder="Action By"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "16.66%", bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              component="input"
              type="text"
              placeholder="Status"
              sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%", bgcolor: "transparent", color: "text.primary", border: 0, borderRadius: 0, outline: "none", fontSize: "inherit" }}
            />
            <Box
              sx={(theme) => ({
                p: 1,
                width: "8.33%",
                textAlign: "center",
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.14),
              })}
            >
              Action
            </Box>
          </Stack>

          {/* Table Data (Main Content) */}
          <Box sx={{ minHeight: "50vh", overflowY: "auto" }}>
            {entries.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>Showing all 0 rows</Box>
            ) : (
              entries.map((entry, index) => (
                <Stack
                  key={index}
                  direction="row"
                  sx={{ borderBottom: 1, borderColor: "divider", fontSize: 12.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%" }}>{entry.date}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%" }}>{entry.type}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>{entry.description}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "16.66%" }}>{entry.createdBy}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "16.66%" }}>{entry.actionBy}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: "8.33%" }}>{entry.status}</Box>
                  <Box sx={{ p: 1, width: "8.33%", textAlign: "center", color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                    View
                  </Box>
                </Stack>
              ))
            )}
          </Box>

          {/* Footer Bar of the Table */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box component="input" type="checkbox" sx={{ width: 12, height: 12 }} />
              <Box component="input" type="checkbox" sx={{ width: 12, height: 12 }} />
              <Box component="input" type="checkbox" sx={{ width: 12, height: 12 }} />
              <Box component="span">Showing all {entries.length} rows</Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {/* Pagination controls would go here */}
              <Box component="button" sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" }, border: 0, bgcolor: "transparent", cursor: "pointer" }}>
                {"<"}
              </Box>
              <Box component="span" sx={{ fontWeight: 600 }}>1</Box>
              <Box component="button" sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" }, border: 0, bgcolor: "transparent", cursor: "pointer" }}>
                {">"}
              </Box>
              <Box sx={{ borderLeft: 1, borderColor: "divider", pl: 1, ml: 1, color: "text.disabled" }}>
                <Box sx={{ width: 16, height: 16, border: "1px solid", borderColor: "divider" }}></Box>
                {/* Scrollbar Placeholder */}
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* --- Footer License/Contact Bar --- */}
      <Stack
        direction="row"
        sx={{ position: "fixed", bottom: 0, width: "100%", justifyContent: "space-between", alignItems: "center", px: 2, py: 0.5, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
      >
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          License : 4J2A3G-SGND8T-L6A7EM-9CH16V @ **STORE SOFT SOLUTION PVT
          LTD.**
        </Box>
        <Box component="span">Customer Care **+91 93840 30115 / 6 / 7**</Box>
      </Stack>
    </Box>
  );
};

export default Intray;
