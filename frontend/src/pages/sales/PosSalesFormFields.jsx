import React from "react";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";

export const TextInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      size="small"
      fullWidth
      sx={{ ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    />
  </Stack>
);

export const SelectInput = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  placeholder = "Select",
}) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      select
      name={name}
      value={value}
      onChange={onChange}
      size="small"
      fullWidth
      sx={{ ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    >
      <MenuItem value="">{placeholder} {label}</MenuItem>
      {options.map((row) => (
        <MenuItem key={row.value} value={row.value}>
          {row.label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

export const DialogTextField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  placeholder = "",
  type = "text",
  inputRef = null,
}) => (
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <TextField
      inputRef={inputRef}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
    />
  </Box>
);

const posSalesDialogNativeSelectSx = {
  width: "100%",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "3.5px",
  bgcolor: "background.paper",
  px: 1.5,
  py: 1,
  fontSize: 12.25,
  color: "text.primary",
};

export const DialogSelectField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  options = [],
  inputRef = null,
  placeholder = "Select",
}) => (
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <Box
      component="select"
      ref={inputRef}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      sx={posSalesDialogNativeSelectSx}
    >
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </Box>
  </Box>
);
