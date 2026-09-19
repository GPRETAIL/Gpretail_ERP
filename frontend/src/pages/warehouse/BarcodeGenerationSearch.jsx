import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, alpha } from "@mui/material";

// Mock Data for Intray results
const mockIntrayResults = [
  {
    date: "05-11-2025",
    type: "Transport Entry",
    description: "LRT/2025/001 - Supplier Alpha",
    createdBy: "User A",
    actionBy: "User A",
    status: "Open",
  },
  {
    date: "04-11-2025",
    type: "Invoice",
    description: "INV/2025/002 - Supplier Beta",
    createdBy: "User B",
    actionBy: "User C",
    status: "Pending",
  },
  {
    date: "03-11-2025",
    type: "Inventory Entry",
    description: "INV-E/003 - Buying Company",
    createdBy: "User C",
    actionBy: "User C",
    status: "Open",
  },
];

// Reusable SelectInput helper component (simplified)
const SelectInput = ({ label, options, value, onChange, name, sx }) => (
  <Box sx={{ flex: 1, minWidth: 0, maxWidth: 150, ...sx }}>
    <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
      {label}
    </Typography>
    <TextField select name={name} value={value} onChange={onChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
      <MenuItem value="ALL">ALL</MenuItem>
      {options.map((option, index) => (
        <MenuItem key={index} value={option.value || option.label}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </Box>
);

const BarcodeGenerationSearch = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [filters, setFilters] = useState({
    type: "ALL",
    company: "ALL",
    status: "Open", // Default status as seen in the image
    date: "",
    // Filters for in-column search:
    descriptionSearch: "",
    createdBySearch: "",
  });

  const [results, setResults] = useState(mockIntrayResults);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    // In a real application, this would fetch data from an API based on filters
    console.log("Searching Intray with filters:", filters);

    // Filter mock data for demonstration
    const filteredResults = mockIntrayResults.filter((entry) => {
      const typeMatch = filters.type === "ALL" || entry.type === filters.type;
      const statusMatch =
        filters.status === "ALL" || entry.status === filters.status;
      const descMatch =
        filters.descriptionSearch === "" ||
        entry.description
          .toLowerCase()
          .includes(filters.descriptionSearch.toLowerCase());
      const createdByMatch =
        filters.createdBySearch === "" ||
        entry.createdBy
          .toLowerCase()
          .includes(filters.createdBySearch.toLowerCase());

      return typeMatch && statusMatch && descMatch && createdByMatch;
    });
    setResults(filteredResults);
  };

  const handleEntryClick = (type, entryId) => {
    // In a real application, this would navigate to the specific entry form (Transport/Invoice/Inventory)
    console.log(`Navigating to ${type} entry for ID: ${entryId}`);
    // Example navigation logic:
    if (type === "Transport Entry")
      navigate("/warehouse/transport-entry/edit/" + entryId);
    // ... other navigations
  };

  // Mock options
  const typeOptions = [
    { label: "Transport Entry" },
    { label: "Invoice" },
    { label: "Inventory Entry" },
    { label: "Barcode Generation" },
  ];
  const statusOptions = [
    { label: "Open" },
    { label: "Pending" },
    { label: "Closed" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* --- Header Section --- */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, position: "sticky", top: 0, zIndex: 10 }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>
            Intray
            <Box component="span" sx={{ fontSize: 12.25, fontWeight: 400, color: "text.secondary", ml: 1 }}>
              | {results.length} Entries
            </Box>
          </Typography>
        </Stack>
      </Stack>

      {/* --- Main Filter Row --- */}
      <Box sx={{ p: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Type Filter */}
          <SelectInput
            label="Type"
            name="type"
            options={typeOptions}
            value={filters.type}
            onChange={handleFilterChange}
          />

          {/* Company Filter */}
          <SelectInput
            label="Company"
            name="company"
            options={companyOptions}
            value={filters.company}
            onChange={handleFilterChange}
          />

          {/* Status Filter */}
          <SelectInput
            label="Status"
            name="status"
            options={statusOptions}
            value={filters.status}
            onChange={handleFilterChange}
          />

          {/* Date Filter */}
          <Box sx={{ flex: 1, maxWidth: 150 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
              Date
            </Typography>
            <TextField type="date" name="date" value={filters.date} onChange={handleFilterChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
          </Box>

          {/* Search Button */}
          <Button onClick={handleSearch} className="glass-btn glass-btn-primary" startIcon={<Search className="w-4 h-4" />} sx={{ height: 34 }}>
            Search
          </Button>
        </Stack>

        {/* --- In-Column Search/Header Row --- */}
        <Stack direction="row" spacing={1} sx={{ mt: 2, fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Box sx={{ width: 100 }}>Date</Box>
          <Box sx={{ width: 150 }}>Type</Box>
          <Box sx={{ flexGrow: 1 }}>Description</Box>
          <Box sx={{ width: 120 }}>Created By</Box>
          <Box sx={{ width: 120 }}>Action By</Box>
          <Box sx={{ width: 100 }}>Status</Box>
          <Box sx={{ width: 80 }}>Action</Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ fontSize: 12.25, mt: 0.5 }}>
          <TextField size="small" sx={{ width: 100, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }} />
          <TextField size="small" sx={{ width: 150, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }} />
          <TextField
            name="descriptionSearch"
            value={filters.descriptionSearch}
            onChange={handleFilterChange}
            size="small"
            fullWidth
            sx={{ flexGrow: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }}
          />
          <TextField
            name="createdBySearch"
            value={filters.createdBySearch}
            onChange={handleFilterChange}
            size="small"
            sx={{ width: 120, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }}
          />
          <TextField size="small" sx={{ width: 120, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }} />
          <TextField size="small" sx={{ width: 100, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }} />
          <Box
            sx={(theme) => ({
              width: 80,
              height: 32,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.14),
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.4 : 0.3),
              borderRadius: "1.75px",
            })}
          ></Box>
        </Stack>
      </Box>

      {/* --- Results Table --- */}
      <Box sx={{ p: 2, overflowX: "auto" }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px" }}>
          {/* Table Data (Main Content) */}
          <Box sx={{ minHeight: "50vh", overflowY: "auto" }}>
            {results.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                No entries found matching your criteria.
              </Box>
            ) : (
              results.map((entry, index) => (
                <Stack
                  key={index}
                  direction="row"
                  onClick={() => handleEntryClick(entry.type, entry.description.split(" - ")[0])}
                  sx={{ borderBottom: 1, borderColor: "divider", fontSize: 12.25, color: "text.primary", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ p: 1, width: 100 }}>{entry.date}</Box>
                  <Box sx={{ p: 1, width: 150, fontWeight: 500, color: "primary.main" }}>
                    {entry.type}
                  </Box>
                  <Box sx={{ p: 1, flexGrow: 1 }}>{entry.description}</Box>
                  <Box sx={{ p: 1, width: 120 }}>{entry.createdBy}</Box>
                  <Box sx={{ p: 1, width: 120 }}>{entry.actionBy}</Box>
                  <Box sx={{ p: 1, width: 100 }}>{entry.status}</Box>
                  <Box sx={{ p: 1, width: 80, textAlign: "center", color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                    View
                  </Box>
                </Stack>
              ))
            )}
          </Box>

          {/* Footer Bar of the Table (Showing row count) */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box component="input" type="checkbox" sx={{ borderRadius: "1.75px" }} />
              <Box component="input" type="checkbox" sx={{ borderRadius: "1.75px" }} />
              <Box component="input" type="checkbox" sx={{ borderRadius: "1.75px" }} />
            </Stack>
            <Box component="span">Showing all {results.length} rows</Box>
          </Stack>
        </Box>
      </Box>

      {/* --- Footer License/Contact Bar (Matching image_ffcc42.png) --- */}
      <Stack
        direction="row"
        sx={{ position: "fixed", bottom: 0, width: "100%", justifyContent: "space-between", alignItems: "center", px: 2, py: 0.5, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
      >
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          License: 432A3G-SGND8T-L6ATEM-9GHI6V @ STORE SOFT SOLUTION PVT LTD.
        </Box>
        <Box component="span">Customer Care **+91 93840 30115 / 6 / 7**</Box>
      </Stack>
    </Box>
  );
};

export default BarcodeGenerationSearch;
