import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Box, Checkbox, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// Small presentational form primitives shared by the User Access page (UserAccess.jsx)
// and the Store Groups management drawer (StoreGroupsDrawer.jsx). Extracted from
// UserAccess.jsx so both can render the same look/behavior without duplicating markup.

// Label stays a separate column to the left of the field (not MUI's own floating label) --
// this two-column layout is the established look across every UserAccess/StoreGroups form.
const fieldLabelSx = { width: "33.333%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" };

export const TextInput = ({ label, value, onChange, type = "text", required = false }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={fieldLabelSx}>
      {required ? <Box component="span" sx={{ mr: 0.5, color: "error.main" }}>*</Box> : null}
      {label}
    </Typography>
    <TextField type={type} value={value} onChange={onChange} size="small" fullWidth sx={{ ml: 1.5 }} />
  </Stack>
);

export const SelectInput = ({ label, value, onChange, options = [], required = false }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={fieldLabelSx}>
      {required ? <Box component="span" sx={{ mr: 0.5, color: "error.main" }}>*</Box> : null}
      {label}
    </Typography>
    <TextField select value={value} onChange={onChange} size="small" fullWidth sx={{ ml: 1.5 }}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} disabled={!!option.disabled}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

export const MultiSelectInput = ({
  label,
  value = [],
  onChange,
  options = [],
  required = false,
  helperText = "",
  placeholder = "Select companies",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = new Set(value.map(String));
  const selectedLabels = options.filter((option) => selectedSet.has(String(option.value))).map((option) => option.label);

  const toggleOption = (optionValue) => {
    const normalizedValue = String(optionValue);
    const nextValues = selectedSet.has(normalizedValue)
      ? value.filter((entry) => String(entry) !== normalizedValue)
      : [...value, normalizedValue];
    onChange(nextValues);
  };

  return (
    <Stack direction="row" sx={{ alignItems: "flex-start" }}>
      <Typography component="label" sx={{ ...fieldLabelSx, pt: 1 }}>
        {required ? <Box component="span" sx={{ mr: 0.5, color: "error.main" }}>*</Box> : null}
        {label}
      </Typography>
      <Box sx={{ position: "relative", ml: 1.5, flex: 1 }} ref={wrapperRef}>
        <Box
          component="button"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          sx={{
            display: "flex", minHeight: 40, width: "100%", alignItems: "center", justifyContent: "space-between",
            borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
            px: 1.5, py: 1, textAlign: "left", fontSize: 12.25, fontFamily: "inherit", cursor: "pointer",
            "&:focus": { borderColor: "primary.main", outline: "none" },
          }}
        >
          <Box component="span" sx={{ color: selectedLabels.length ? "text.primary" : "text.disabled" }}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </Box>
          <Box sx={{ color: "text.secondary", display: "inline-flex", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
            <ChevronDown className="h-4 w-4" />
          </Box>
        </Box>

        {isOpen ? (
          <Box
            sx={{
              position: "absolute", zIndex: 20, mt: 0.5, maxHeight: 224, width: "100%", overflow: "auto",
              borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 4,
            }}
          >
            {options.map((option) => {
              const checked = selectedSet.has(String(option.value));
              return (
                <Stack
                  key={option.value}
                  component="label"
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center", cursor: "pointer", borderBottom: "1px solid", borderColor: "divider",
                    px: 1.5, py: 1, fontSize: 12.25, color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 },
                  }}
                >
                  <Checkbox checked={checked} onChange={() => toggleOption(option.value)} size="small" sx={{ p: 0 }} />
                  <Box component="span">{option.label}</Box>
                </Stack>
              );
            })}
          </Box>
        ) : null}

        {selectedLabels.length ? (
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
            {selectedLabels.map((selectedLabel) => (
              <Box
                key={selectedLabel}
                component="span"
                sx={{ borderRadius: "50px", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08), px: 1, py: 0.5, fontSize: 10.5, fontWeight: 500, color: "primary.main" }}
              >
                {selectedLabel}
              </Box>
            ))}
          </Stack>
        ) : null}

        {helperText ? <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>{helperText}</Typography> : null}
      </Box>
    </Stack>
  );
};
