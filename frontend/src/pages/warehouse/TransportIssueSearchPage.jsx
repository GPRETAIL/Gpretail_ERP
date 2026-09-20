import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, alpha } from "@mui/material";

// Reusable SelectInput helper component (simplified)
const SelectInput = ({ label, options, value, onChange, name, isRequired = false }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
      {isRequired && (
        <Box component="span" sx={{ color: "error.main", mr: 0.25 }}>
          *
        </Box>
      )}
      {label}
    </Typography>
    <TextField select name={name} value={value} onChange={onChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
      <MenuItem value="">ALL</MenuItem>
      {options.map((option, index) => (
        <MenuItem key={index} value={option.value || option.label}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </Box>
);

const TransportIssueSearchPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    bookingOffice: "",
    supplier: "",
    issueNo: "",
    issueDate: "",
    fromCity: "",
    fromLocation: "",
  });

  const [results, setResults] = useState([]); // Mock search results state

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    console.log("Searching Transport Issues with filters:", filters);
    // In a real app, this would fetch data from an API based on filters
    setResults([
      // Mock results for demonstration
      {
        issueNo: "TI/2025/001",
        office: "Office A",
        supplier: "Supp A",
        date: "05-11-2025",
        city: "City A",
      },
    ]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Mock options
  const officeOptions = [
    { label: "Booking Office A" },
    { label: "Booking Office B" },
  ];
  const supplierOptions = [{ label: "Supplier X" }, { label: "Supplier Y" }];
  const cityOptions = [{ label: "City A" }, { label: "City B" }];
  const locationOptions = [{ label: "Location 1" }, { label: "Location 2" }];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* --- Header Section (Back/Search) --- */}
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
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600 }}>
            Warehouse / Transport Issue Search
          </Typography>
        </Stack>
        <Button onClick={handleSearch} className="glass-btn glass-btn-primary" startIcon={<Search size={16} />}>
          Search
        </Button>
      </Stack>

      {/* --- Filters Section (Vertical Layout) --- */}
      <Box sx={{ p: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
          {/* Column 1: Main Filter Fields */}
          <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 320 }}>
            <SelectInput
              label="Booking Office"
              name="bookingOffice"
              options={officeOptions}
              value={filters.bookingOffice}
              onChange={handleFilterChange}
            />

            <SelectInput
              label="Supplier"
              name="supplier"
              options={supplierOptions}
              value={filters.supplier}
              onChange={handleFilterChange}
            />

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
                Issue No
              </Typography>
              <TextField
                name="issueNo"
                value={filters.issueNo}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Box>

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
                Issue Date
              </Typography>
              <TextField
                type="date"
                name="issueDate"
                value={filters.issueDate}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Box>

            <SelectInput
              label="From City"
              name="fromCity"
              options={cityOptions}
              value={filters.fromCity}
              onChange={handleFilterChange}
            />

            <SelectInput
              label="Location"
              name="fromLocation"
              options={locationOptions}
              value={filters.fromLocation}
              onChange={handleFilterChange}
            />
          </Stack>

          {/* Columns 2, 3, 4 (Empty for spacing) */}
          <Box></Box>
          <Box></Box>
          <Box></Box>
        </Box>
      </Box>

      {/* --- Results Table --- */}
      <Box sx={{ p: 2, overflowX: "auto" }}>
        <Typography component="h2" sx={{ fontSize: 15.75, fontWeight: 600, mb: 1.5 }}>
          Search Results ({results.length})
        </Typography>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px" }}>
          {/* Table Header Row */}
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
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 120 }}>Issue No</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 100 }}>Date</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>Booking Office</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>Supplier</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 150 }}>From City</Box>
            <Box sx={{ p: 1, width: 80, textAlign: "center" }}>Action</Box>
          </Stack>

          {/* Table Data */}
          <Box sx={{ minHeight: "30vh", overflowY: "auto" }}>
            {results.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                No transport issue records found.
              </Box>
            ) : (
              results.map((entry, index) => (
                <Stack
                  key={index}
                  direction="row"
                  onClick={() => console.log(`Viewing Issue ${entry.issueNo}`)}
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    fontSize: 12.25,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 120, fontWeight: 500, color: "primary.main" }}>
                    {entry.issueNo}
                  </Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 100 }}>{entry.date}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>{entry.office}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>{entry.supplier}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 150 }}>{entry.city}</Box>
                  <Box sx={{ p: 1, width: 80, textAlign: "center", color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                    View
                  </Box>
                </Stack>
              ))
            )}
          </Box>

          {/* Footer Bar of the Table */}
          <Stack
            direction="row"
            sx={{ justifyContent: "flex-start", alignItems: "center", p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
          >
            <Box component="span">Showing all {results.length} rows</Box>
          </Stack>
        </Box>
      </Box>

      {/* --- Footer License/Contact Bar --- */}
      <Stack
        direction="row"
        sx={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 0.5,
          fontSize: 10.5,
          color: "text.secondary",
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          License: ... @ STORE SOFT SOLUTION PVT LTD
        </Box>
        <Box component="span">Customer Care **+91 93840 30115 / 6 / 7**</Box>
      </Stack>
    </Box>
  );
};

export default TransportIssueSearchPage;
