// Shared ERP control and grid dimensions. Keep module pages free of local copies.
export const ERP_UI = Object.freeze({
  controlRadius: "0.5rem",
  actionHeight: 28,
  filterPanelWidth: 340,
  columnFilterWidth: 190,
  autoHideScrollbars: true,
});

export const erpControlSx = {
  "& .MuiOutlinedInput-root": { borderRadius: ERP_UI.controlRadius },
  "& .MuiOutlinedInput-notchedOutline": { borderRadius: "inherit" },
  "& input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), & select": { borderRadius: ERP_UI.controlRadius },
};

export const erpActionSx = {
  "& .topbar-action-btn, & .MuiButton-root": { height: ERP_UI.actionHeight, minHeight: ERP_UI.actionHeight, boxSizing: "border-box" },
};
