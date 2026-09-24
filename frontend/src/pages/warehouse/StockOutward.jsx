import React, { useState } from "react";
import { ArrowLeft, Search, Save, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, alpha } from "@mui/material";
import { muiFieldSx } from "../../theme/formControlSizes";

// --- Custom Components for Reusability ---

const FormField = ({ label, type = "text", isDate = false, isSelect = false, isRequired = false, options = [], sx }) => (
  <Box sx={{ fontSize: 12.25, ...sx }}>
    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>
      {isRequired && (
        <Box component="span" sx={{ color: "error.main", mr: 0.25 }}>
          *
        </Box>
      )}
      {label}
    </Typography>
    {isSelect ? (
      <TextField select size="small" fullWidth sx={muiFieldSx}>
        <MenuItem value="">Select...</MenuItem>
        {options.map((opt, index) => (
          <MenuItem key={index} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    ) : (
      <TextField type={isDate ? "date" : type} size="small" fullWidth sx={muiFieldSx} />
    )}
  </Box>
);

// --- Main Component ---

const StockOutward = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions();
  const [sourceItems, setSourceItems] = useState([]); // Items from the source
  const [acceptedItems, setAcceptedItems] = useState([]); // Items accepted for outward dispatch

  const handleSearch = () => {
    navigate("/warehouse/stock-outward/search");
  };

  const handleAddItemToAccepted = (item) => {
    setSourceItems((prev) => prev.filter((i) => i.barcode !== item.barcode));
    setAcceptedItems((prev) => [...prev, item]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleSaveClick = () => {
    console.log("Saving Stock Outward:", acceptedItems);
    alert("Stock Outward saved!");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* --- Header & Action Bar --- */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, position: "sticky", top: 0, zIndex: 10 }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={handleBackClick} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>
            Warehouse / Stock Outward
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ fontSize: 12.25 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "success.main", alignSelf: "center" }}>
            Last Saved
          </Typography>
          <Button onClick={handleSaveClick} className="glass-btn glass-btn-success" startIcon={<Save size={16} />}>
            New
          </Button>
          <Button onClick={handleSaveClick} className="glass-btn glass-btn-success" startIcon={<Save size={16} />}>
            Save
          </Button>
          <Button onClick={handleSearch} className="glass-btn glass-btn-primary" startIcon={<Search size={16} />}>
            Search
          </Button>
        </Stack>
      </Stack>

      {/* --- Main Content Area (Form & Grids) --- */}
      <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        <Box sx={{ bgcolor: "background.paper", p: 2, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
          {/* Top Header Row - Two Columns */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 4, rowGap: 1.5 }}>
            {/* Left Column Fields */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
              <Box sx={{ gridColumn: "span 1" }}>
                <FormField label="* Date" isDate isRequired />
              </Box>
              <Stack direction="row" spacing={1} sx={{ gridColumn: "span 3" }}>
                <Box sx={{ flex: 1 }}>
                  <FormField label="Code" />
                </Box>
                <IconButton className="glass-btn glass-btn-primary" sx={{ alignSelf: "flex-end" }}>
                  <Search size={16} />
                </IconButton>
              </Stack>

              <Box sx={{ gridColumn: "span 4" }}>
                <FormField
                  label="* From Company"
                  isSelect
                  isRequired
                  options={companyOptions.map((row) => row.label)}
                />
              </Box>

              <Box sx={{ gridColumn: "span 4" }}>
                <FormField label="Date" isDate />
              </Box>

              <Box sx={{ gridColumn: "span 4" }}>
                <FormField
                  label="Source"
                  isSelect
                  isRequired
                  options={["Pending", "Approved"]}
                />
              </Box>

              <Box sx={{ gridColumn: "span 4" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>
                      supplier
                    </Typography>
                    <TextField placeholder="supplier" size="small" fullWidth sx={muiFieldSx} />
                  </Box>
                  <IconButton onClick={handleSearch} className="glass-btn glass-btn-primary" sx={{ alignSelf: "flex-end" }}>
                    <Search size={16} />
                  </IconButton>
                  <IconButton onClick={handleSearch} className="glass-btn glass-btn-danger" sx={{ alignSelf: "flex-end" }}>
                    <X size={16} />
                  </IconButton>
                </Stack>
              </Box>
            </Box>

            {/* Right Column Fields */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              <Box sx={{ gridColumn: "span 2" }}>
                <FormField
                  label="* Packed By"
                  isSelect
                  isRequired
                  options={["Employee 1", "Employee 2"]}
                />
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <FormField
                  label="* From Location"
                  isSelect
                  isRequired
                  options={["Location A", "Location B"]}
                />
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <FormField
                  label="* To Location"
                  isSelect
                  isRequired
                  options={["Location X", "Location Y"]}
                />
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ gridColumn: "span 2", alignItems: "center" }}>
                <Box component="input" type="checkbox" sx={{ borderRadius: "1.75px" }} />
                <Box sx={{ flex: 1 }}>
                  <FormField label="Barcode" />
                </Box>
                <IconButton className="glass-btn glass-btn-primary" sx={{ alignSelf: "flex-end" }}>
                  <Plus size={16} />
                </IconButton>
                <IconButton className="glass-btn glass-btn-danger" sx={{ alignSelf: "flex-end" }}>
                  <X size={16} />
                </IconButton>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* --- Dual Grids Section --- */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
          {/* LEFT GRID: Source/Pending Items */}
          <Box sx={{ width: "100%" }}>
            <Typography component="h3" sx={{ fontSize: 15.75, fontWeight: 600, color: "text.secondary", mb: 1 }}>
              Source Items ({sourceItems.length})
            </Typography>
            <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden" }}>
              {/* Grid Header Row */}
              <Stack
                direction="row"
                sx={(theme) => ({
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                })}
              >
                <Box sx={{ p: 1, width: 80 }}>Barcode</Box>
                <Box sx={{ p: 1, width: 120 }}>Name</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center" }}>Size</Box>
                <Box sx={{ p: 1, flex: 1 }}>Supplier</Box>
                <Box sx={{ p: 1, width: 60 }}>LR.Ref</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "right" }}>Cost</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center" }}>Qty</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center" }}>Action</Box>
              </Stack>

              {/* Input/Filter Row */}
              <Stack direction="row" sx={{ alignItems: "center", fontSize: 12.25, bgcolor: "action.hover", p: 0.25, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ width: 80, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 120, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ flex: 1, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 60, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}></Box>
              </Stack>

              {/* Data Rows */}
              <Box sx={{ minHeight: "40vh", overflowY: "auto" }}>
                {sourceItems.length === 0 ? (
                  <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                    No items pending for outward processing.
                  </Box>
                ) : (
                  sourceItems.map((item, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      sx={{ alignItems: "center", fontSize: 12.25, color: "text.primary", "&:hover": { bgcolor: "action.hover" }, borderBottom: 1, borderColor: "divider" }}
                    >
                      <Box sx={{ p: 1, width: 80, fontFamily: "monospace", fontSize: 10.5 }}>
                        {item.barcode}
                      </Box>
                      <Box sx={{ p: 1, width: 120 }}>{item.name}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center" }}>
                        {item.size}
                      </Box>
                      <Box sx={{ p: 1, flex: 1, fontSize: 10.5 }}>{item.supplier}</Box>
                      <Box sx={{ p: 1, width: 60, fontSize: 10.5 }}>{item.lrRef}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "right" }}>
                        {item.cost.toFixed(2)}
                      </Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center" }}>{item.qty}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center" }}>
                        <IconButton
                          onClick={() => handleAddItemToAccepted(item)}
                          size="small"
                          sx={{ color: "success.main", p: 0.5 }}
                        >
                          <Plus size={16} />
                        </IconButton>
                      </Box>
                    </Stack>
                  ))
                )}
              </Box>
              <Box sx={{ p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
                Showing all {sourceItems.length} rows
              </Box>
            </Box>
          </Box>

          {/* RIGHT GRID: Accepted/Stock Outward Items */}
          <Box sx={{ width: "100%" }}>
            <Typography component="h3" sx={{ fontSize: 15.75, fontWeight: 600, color: "text.secondary", mb: 1 }}>
              Accepted Items ({acceptedItems.length})
            </Typography>
            <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden" }}>
              {/* Grid Header Row */}
              <Stack
                direction="row"
                sx={(theme) => ({
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                })}
              >
                <Box sx={{ p: 1, width: 80 }}>Barcode</Box>
                <Box sx={{ p: 1, width: 120 }}>Name</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center" }}>Size</Box>
                <Box sx={{ p: 1, flex: 1 }}>Supplier</Box>
                <Box sx={{ p: 1, width: 60 }}>LR.Ref</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "right" }}>Cost</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center" }}>Qty</Box>
                <Box sx={{ p: 1, width: 50, textAlign: "center", fontWeight: 700 }}>
                  Accepted
                </Box>
              </Stack>

              {/* Input/Filter Row */}
              <Stack direction="row" sx={{ alignItems: "center", fontSize: 12.25, bgcolor: "action.hover", p: 0.25, borderBottom: 1, borderColor: "divider" }}>
                {/* Identical input row to the left grid, except for the last column */}
                <Box sx={{ width: 80, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 120, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ flex: 1, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 60, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}>
                  <TextField size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 10.5, p: 0.5 } }} />
                </Box>
                <Box sx={{ width: 50, p: 0.25 }}></Box>
              </Stack>

              {/* Data Rows */}
              <Box sx={{ minHeight: "40vh", overflowY: "auto" }}>
                {acceptedItems.length === 0 ? (
                  <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                    Items accepted for dispatch will appear here.
                  </Box>
                ) : (
                  acceptedItems.map((item, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      sx={{ alignItems: "center", fontSize: 12.25, color: "text.primary", "&:hover": { bgcolor: "action.hover" }, borderBottom: 1, borderColor: "divider" }}
                    >
                      <Box sx={{ p: 1, width: 80, fontFamily: "monospace", fontSize: 10.5 }}>
                        {item.barcode}
                      </Box>
                      <Box sx={{ p: 1, width: 120 }}>{item.name}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center" }}>
                        {item.size}
                      </Box>
                      <Box sx={{ p: 1, flex: 1, fontSize: 10.5 }}>{item.supplier}</Box>
                      <Box sx={{ p: 1, width: 60, fontSize: 10.5 }}>{item.lrRef}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "right" }}>
                        {item.cost.toFixed(2)}
                      </Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center" }}>{item.qty}</Box>
                      <Box sx={{ p: 1, width: 50, textAlign: "center", color: "success.main", fontWeight: 700 }}>
                        Yes
                      </Box>
                    </Stack>
                  ))
                )}
              </Box>
              <Box sx={{ p: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
                Showing all {acceptedItems.length} rows
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* --- Global Footer Bar --- */}
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", p: 1.5, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", position: "sticky", bottom: 0, zIndex: 10 }}>
        <Button onClick={handleSaveClick} className="glass-btn glass-btn-success">
          Save & Exit
        </Button>
        <Button className="glass-btn glass-btn-secondary">
          Clear
        </Button>
      </Stack>
    </Box>
  );
};

export default StockOutward;
