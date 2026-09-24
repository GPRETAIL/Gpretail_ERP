// Single source of truth for the size every form field in this app shares -- plain native fields
// (CustomInputs.jsx and pages composing their own rows via fieldBaseSx), MUI TextFields (muiFieldSx),
// SearchableSelect/AsyncSearchSelect triggers, and the .topbar-action-btn family (index.css).
// Most of these are hand-rolled Box-based components, not real MUI Button/Select/Autocomplete, so a
// genuine theme.components style override can't reach them; this module is the equivalent for
// components outside MUI's own override system. Import and spread these instead of redefining a
// page-local *_SX constant (the pattern this replaces, e.g. TransportEntry.jsx's former
// TRANSPORT_SEARCHABLE_TRIGGER_SX) -- a page only needs its own override when it has a genuinely
// different requirement (e.g. POSOld.jsx's larger touch-target controls, or a dense line-item grid
// cell), not for the common case.
//
// index.css's .topbar-action-btn min-height/padding/font-size are kept numerically in sync with
// TOOLBAR_BUTTON_HEIGHT/etc. below by hand (CSS can't import a JS module) -- update both together.
export const FIELD_HEIGHT = 30;
export const FIELD_FONT_SIZE = 11.5;

export const focusRingSx = {
  outline: "none",
  "&:focus": { borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" },
};

// Native <input>/<select>/<textarea> rendered as <Box component="...">.
export const fieldBaseSx = (disabled) => ({
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "2px",
  // Explicit height (not just padding) so a native <select> -- whose appearance:auto chrome adds
  // ~1.5px over an <input> with identical padding -- and SearchableSelect's trigger all land on
  // exactly the same row height.
  height: FIELD_HEIGHT,
  px: 1,
  py: 0,
  fontSize: FIELD_FONT_SIZE,
  bgcolor: disabled ? "action.disabledBackground" : "background.paper",
  color: "text.primary",
  cursor: disabled ? "not-allowed" : "auto",
  opacity: disabled ? 0.7 : 1,
  ...focusRingSx,
});

// The MUI <TextField size="small"> counterpart of fieldBaseSx, for pages that still render MUI
// TextFields, so a form mixing both kinds of field lines up. Opt-in per field rather than a
// theme-wide override on purpose -- dense line-item grid cells (Direct Purchase, Invoice Entry, ...)
// use the very same small TextField and must stay at their compact row height. Per-field extras go
// in a second sx array entry so they layer on top: sx={[muiFieldSx, { width: 160 }]}.
export const muiFieldSx = {
  "& .MuiInputBase-root": { height: FIELD_HEIGHT, fontSize: FIELD_FONT_SIZE, borderRadius: "2px", bgcolor: "background.paper" },
  // Plain selector on purpose so a page's own "& .MuiInputBase-input" override (e.g. pr for overlaid
  // icons) in a later sx array entry still wins. A select keeps its chevron room regardless: MUI
  // pads .MuiSelect-select via a "&&&" specificity bump that outranks this.
  "& .MuiInputBase-input": { py: 0, px: 1, fontSize: FIELD_FONT_SIZE },
  "& .MuiSelect-select": { display: "flex", alignItems: "center", height: "100%", minHeight: 0 },
  // slotProps={{ select: { native: true } }}: stretch the real <select> so its whole 30px is clickable.
  "& .MuiNativeSelect-select": { height: "100%", boxSizing: "border-box" },
  "& .MuiInputAdornment-root": { fontSize: FIELD_FONT_SIZE },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
  "& .MuiInputBase-multiline": { height: "auto", py: 0.75, pl: 1 },
  "& .MuiInputBase-multiline .MuiInputBase-input": { pl: 0 },
  "& .Mui-disabled": { bgcolor: "action.disabledBackground" },
};

export const SEARCHABLE_TRIGGER_HEIGHT = FIELD_HEIGHT;
export const SEARCHABLE_FONT_SIZE = FIELD_FONT_SIZE;

export const SEARCHABLE_TRIGGER_SX = { height: SEARCHABLE_TRIGGER_HEIGHT, px: 1, py: 0.25, fontSize: SEARCHABLE_FONT_SIZE };
export const SEARCHABLE_INPUT_SX = { fontSize: SEARCHABLE_FONT_SIZE };

export const TOOLBAR_BUTTON_HEIGHT = 24;
