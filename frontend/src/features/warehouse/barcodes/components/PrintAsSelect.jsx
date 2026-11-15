import { MenuItem, TextField } from "@mui/material";

// A sticker keeps the format it was generated with; this prints it as the other one when needed. Both carry the
// same number (the QR holds the barcode text), so the counter scanner reads the same item either way.
const PRINT_AS_OPTIONS = [
  { value: "", label: "As generated" },
  { value: "barcode", label: "Barcode" },
  { value: "code", label: "QR code" },
];

const PrintAsSelect = ({ value, onChange, fullWidth = false }) => (
  <TextField
    select
    size="small"
    label="Print as"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    fullWidth={fullWidth}
    // "As generated" is the empty value; show it rather than an empty box.
    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
    sx={{ minWidth: 140, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
  >
    {PRINT_AS_OPTIONS.map((option) => (
      <MenuItem key={option.value || "saved"} value={option.value}>{option.label}</MenuItem>
    ))}
  </TextField>
);

export default PrintAsSelect;
