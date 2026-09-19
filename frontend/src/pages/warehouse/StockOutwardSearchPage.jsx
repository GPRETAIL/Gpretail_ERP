import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Radio, alpha } from "@mui/material";

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

// Input Field helper
const InputField = ({ label, type = "text", value, onChange, name, isDate = false, isRadio = false }) => (
  <Box>
    <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>
      {label}
    </Typography>
    {isRadio ? (
      <Stack direction="row" spacing={2}>
        <Stack component="label" direction="row" sx={{ alignItems: "center", fontSize: 12.25, color: "text.secondary" }}>
          <Radio
            name={name}
            value="Warehouse"
            checked={value === "Warehouse"}
            onChange={onChange}
            size="small"
            sx={{ p: 0.5, mr: 0.5 }}
          />
          From Warehouse
        </Stack>
        <Stack component="label" direction="row" sx={{ alignItems: "center", fontSize: 12.25, color: "text.secondary" }}>
          <Radio
            name={name}
            value="Retail"
            checked={value === "Retail"}
            onChange={onChange}
            size="small"
            sx={{ p: 0.5, mr: 0.5 }}
          />
          From Retail
        </Stack>
      </Stack>
    ) : (
      <TextField
        type={isDate ? "date" : type}
        name={name}
        value={value}
        onChange={onChange}
        size="small"
        fullWidth
        sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
      />
    )}
  </Box>
);

const StockOutwardSearchPage = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [filters, setFilters] = useState({
    fromCompany: "",
    toCompany: "",
    fromLocation: "",
    toLocation: "",
    status: "",
    outwardDate: "",
    code: "",
    sourceType: "Warehouse", // Default radio selection
  });

  const [results, setResults] = useState([]); // Mock search results state

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    console.log("Searching Stock Outward with filters:", filters);
    // Mock results for demonstration
    setResults([
      {
        code: "SO/2025/001",
        from: "Comp A",
        to: "Comp B",
        date: "05-11-2025",
        status: "Closed",
      },
      {
        code: "SO/2025/002",
        from: "Comp B",
        to: "Comp C",
        date: "06-11-2025",
        status: "Pending",
      },
    ]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Mock options
  const locationOptions = [{ label: "Location 1" }, { label: "Location 2" }];
  const statusOptions = [
    { label: "Pending" },
    { label: "Closed" },
    { label: "In Transit" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* --- Header Section (Back/Search) --- */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, position: "sticky", top: 0, zIndex: 10 }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={handleBackClick} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600 }}>
            Warehouse / Stock Outward Search
          </Typography>
        </Stack>
        <Button onClick={handleSearch} className="glass-btn glass-btn-primary" startIcon={<Search className="w-4 h-4" />}>
          Search
        </Button>
      </Stack>

      {/* --- Filters Section --- */}
      <Box sx={{ p: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
          {/* Column 1 */}
          <Stack spacing={2}>
            <SelectInput
              label="From Company"
              name="fromCompany"
              options={companyOptions}
              value={filters.fromCompany}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="To Company"
              name="toCompany"
              options={companyOptions}
              value={filters.toCompany}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="From Location"
              name="fromLocation"
              options={locationOptions}
              value={filters.fromLocation}
              onChange={handleFilterChange}
            />
          </Stack>

          {/* Column 2 */}
          <Stack spacing={2}>
            <SelectInput
              label="To Location"
              name="toLocation"
              options={locationOptions}
              value={filters.toLocation}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="Status"
              name="status"
              options={statusOptions}
              value={filters.status}
              onChange={handleFilterChange}
            />
            <InputField
              label="Outward Date"
              name="outwardDate"
              isDate
              value={filters.outwardDate}
              onChange={handleFilterChange}
            />
          </Stack>

          {/* Column 3 */}
          <Stack spacing={2}>
            <InputField
              label="Code"
              name="code"
              value={filters.code}
              onChange={handleFilterChange}
            />
            <InputField
              label=""
              name="sourceType"
              isRadio
              value={filters.sourceType}
              onChange={handleFilterChange}
            />
          </Stack>

          {/* Columns 4 & 5 (Empty for spacing) */}
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
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 120 }}>Code</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 100 }}>Date</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>From Company</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>To Company</Box>
            <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 150 }}>Status</Box>
            <Box sx={{ p: 1, width: 80, textAlign: "center" }}>Action</Box>
          </Stack>

          {/* Table Data */}
          <Box sx={{ minHeight: "30vh", overflowY: "auto" }}>
            {results.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                No stock outward records found.
              </Box>
            ) : (
              results.map((entry, index) => (
                <Stack
                  key={index}
                  direction="row"
                  onClick={() => console.log(`Viewing Outward ${entry.code}`)}
                  sx={{ borderBottom: 1, borderColor: "divider", fontSize: 12.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 120, fontWeight: 500, color: "primary.main" }}>
                    {entry.code}
                  </Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 100 }}>{entry.date}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>{entry.from}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", flexGrow: 1 }}>{entry.to}</Box>
                  <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", width: 150 }}>{entry.status}</Box>
                  <Box sx={{ p: 1, width: 80, textAlign: "center", color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                    View
                  </Box>
                </Stack>
              ))
            )}
          </Box>

          {/* Footer Bar of the Table */}
          <Stack direction="row" sx={{ justifyContent: "flex-start", alignItems: "center", p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Box component="span">Showing all {results.length} rows</Box>
          </Stack>
        </Box>
      </Box>

      {/* --- Footer License/Contact Bar (Placeholder) --- */}
      <Stack
        direction="row"
        sx={{ position: "fixed", bottom: 0, width: "100%", justifyContent: "space-between", alignItems: "center", px: 2, py: 0.5, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
      >
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          License: ... @ STORE SOFT SOLUTION PVT LTD
        </Box>
        <Box component="span">Customer Care **+91 93840 30115 / 6 / 7**</Box>
      </Stack>
    </Box>
  );
};

export default StockOutwardSearchPage;
