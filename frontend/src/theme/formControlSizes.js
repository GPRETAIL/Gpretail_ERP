// Single source of truth for the "common" size shared by every plain, non-MUI form control in
// this app -- SearchableSelect, AsyncSearchSelect, and the .topbar-action-btn family (index.css).
// These are hand-rolled Box-based components, not real MUI Button/Select/Autocomplete, so a
// genuine theme.components style override can't reach them; this module is the equivalent for
// components outside MUI's own override system. Import and spread these instead of redefining a
// page-local *_SX constant (the pattern this replaces, e.g. TransportEntry.jsx's former
// TRANSPORT_SEARCHABLE_TRIGGER_SX) -- a page only needs its own override when it has a genuinely
// different requirement (e.g. POSOld.jsx's larger touch-target controls), not for the common case.
//
// index.css's .topbar-action-btn min-height/padding/font-size are kept numerically in sync with
// TOOLBAR_BUTTON_HEIGHT/etc. below by hand (CSS can't import a JS module) -- update both together.
export const SEARCHABLE_TRIGGER_HEIGHT = 32;
export const SEARCHABLE_FONT_SIZE = 11;

export const SEARCHABLE_TRIGGER_SX = { height: SEARCHABLE_TRIGGER_HEIGHT, px: 1, py: 0.25, fontSize: SEARCHABLE_FONT_SIZE };
export const SEARCHABLE_INPUT_SX = { fontSize: SEARCHABLE_FONT_SIZE };

export const TOOLBAR_BUTTON_HEIGHT = 24;
