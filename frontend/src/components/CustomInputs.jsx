import { Box } from "@mui/material";
import AsyncSearchSelect from "./AsyncSearchSelect";

const focusRingSx = {
  outline: "none",
  "&:focus": { borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" },
};

const fieldBaseSx = (disabled) => ({
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "2px",
  p: 0.5,
  fontSize: 10.5,
  bgcolor: disabled ? "action.disabledBackground" : "background.paper",
  color: "text.primary",
  cursor: disabled ? "not-allowed" : "auto",
  opacity: disabled ? 0.7 : 1,
  ...focusRingSx,
});

const TextInput = ({
  label,
  name,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>} {label}
    </Box>
    <Box
      component="input"
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      sx={{ flex: 1, ...fieldBaseSx(disabled) }}
    />
  </Box>
);
const SelectInput = ({
  label,
  name,
  required = false,
  options = [],
  value,
  onChange,
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>} {label}
    </Box>
    <Box
      component="select"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      sx={{ flex: 1, ...fieldBaseSx(disabled) }}
    >
      <option value="">Select {label}</option>
      {(options || []).map((option, index) => (
        <option key={index} value={option.value || option.label}>
          {option.label}
        </option>
      ))}
    </Box>
  </Box>
);
const CheckboxInput = ({
  label,
  name,
  checked,
  onChange,
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {label}
    </Box>
    <Box
      component="input"
      type="checkbox"
      name={name}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      sx={{
        width: 12, height: 12, accentColor: "#2563eb", borderColor: "divider", borderRadius: "2px",
        cursor: disabled ? "not-allowed" : "auto", opacity: disabled ? 0.7 : 1, ...focusRingSx,
      }}
    />
  </Box>
);
const CheckboxSelectInput = ({
  label,
  checkName,
  checkValue,
  selectName,
  selectValue,
  options = [],
  onChange,
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {label}
    </Box>
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        component="input"
        type="checkbox"
        name={checkName}
        checked={checkValue}
        onChange={onChange}
        disabled={disabled}
        sx={{
          width: 12, height: 12, accentColor: "#2563eb", borderColor: "divider", borderRadius: "2px",
          cursor: disabled ? "not-allowed" : "auto", opacity: disabled ? 0.7 : 1, ...focusRingSx,
        }}
      />

      <Box
        component="select"
        name={selectName}
        value={selectValue}
        onChange={onChange}
        disabled={!checkValue || disabled}
        sx={{ flex: 1, ...fieldBaseSx(!checkValue || disabled) }}
      >
        <option value="">Select</option>
        {options.map((option, index) => (
          <option key={index} value={option.value || option.label}>
            {option.label}
          </option>
        ))}
      </Box>
    </Box>
  </Box>
);
const DualTextInput = ({
  label,
  name1,
  value1,
  name2,
  value2,
  onChange,
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {label}
    </Box>
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        component="input"
        type="number"
        name={name1}
        value={value1}
        onChange={onChange}
        placeholder="Min"
        disabled={disabled}
        sx={{ width: "50%", ...fieldBaseSx(disabled) }}
      />
      <Box
        component="input"
        type="number"
        name={name2}
        value={value2}
        onChange={onChange}
        placeholder="Max"
        disabled={disabled}
        sx={{ width: "50%", ...fieldBaseSx(disabled) }}
      />
    </Box>
  </Box>
);

/**
 * Same label/layout contract as SelectInput, but backed by AsyncSearchSelect so the field can
 * find rows beyond whatever was preloaded. For fields fed by large tables (taxes, products,
 * brands, suppliers, employees...) where a plain <select> over a capped preload can't ever
 * surface most of the real data. Small fixed lists should keep using SelectInput.
 */
const AsyncSelectInput = ({
  label,
  name,
  required = false,
  options = [],
  value,
  onChange,
  onAsyncSearch,
  disabled = false,
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>} {label}
    </Box>
    <Box sx={{ flex: 1 }}>
      <AsyncSearchSelect
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        onAsyncSearch={onAsyncSearch}
        disabled={disabled}
        placeholder={`Select ${label}`}
        searchPlaceholder={`Search ${String(label || "").toLowerCase()}...`}
      />
    </Box>
  </Box>
);

export {
  TextInput,
  CheckboxInput,
  CheckboxSelectInput,
  DualTextInput,
  SelectInput,
  AsyncSelectInput,
};
