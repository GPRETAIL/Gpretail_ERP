import { Check, ChevronRight, Columns3, Filter, MoveHorizontal, Pin } from "lucide-react";
import { Box, Divider, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import { TYPE } from "@/shared/theme/typeScale";

// The right-click menus of FilterableDataTable: one on a column header, one on a row cell. The table owns
// the state (which menu is open, where, and what it applies to); these only draw it and report choices.

const menuPaperSx = { bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, boxShadow: 4 };
const ROW_PIN_CHOICES = [[null, "No pin"], ["top", "Pin to top"], ["bottom", "Pin to bottom"]];
const COLUMN_PIN_CHOICES = [[null, "No pin"], ["left", "Pin left"], ["right", "Pin right"]];

// Menu items are returned by plain functions, not components, so they stay direct children of the menu list:
// MUI's MenuList gives its first (or selected) item focus and tabIndex by cloning that direct child.

/** A main-menu item that opens a side menu on hover, click or →. */
function submenuTrigger({ open, onOpen, icon, label, hint, fontSize = TYPE.body }) {
  return (
    <MenuItem
      aria-haspopup="menu"
      aria-expanded={open}
      onMouseEnter={(event) => onOpen(event.currentTarget)}
      onClick={(event) => onOpen(event.currentTarget)}
      onKeyDown={(event) => { if (event.key === "ArrowRight") onOpen(event.currentTarget); }}
      selected={open}
      sx={{ gap: 1, fontSize }}
    >
      {icon}
      {label}
      <Box component="span" sx={{ ml: "auto", pl: 2, color: "text.secondary", fontSize: TYPE.small }}>
        {hint}
      </Box>
      <ChevronRight size={14} />
    </MenuItem>
  );
}

/** The side menu. Not modal: the main menu stays hoverable, so moving to another item closes this one. */
function SideSubmenu({ anchor, onClose, minWidthClass, children }) {
  return (
    <Menu
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      hideBackdrop
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      sx={{ pointerEvents: "none" }}
      slotProps={{
        paper: { className: `${minWidthClass} py-1`, sx: { pointerEvents: "auto", ...menuPaperSx } },
        list: { onKeyDown: (event) => { if (event.key === "ArrowLeft" || event.key === "Escape") onClose(); } },
      }}
    >
      {children}
    </Menu>
  );
}

/** Radio items (No pin / one side / the other), ticking the current side. */
function pinChoices({ choices, current, onChoose }) {
  return choices.map(([side, label]) => (
    <MenuItem
      key={label}
      role="menuitemradio"
      aria-checked={current === side}
      selected={current === side}
      onClick={() => onChoose(side)}
      sx={{ gap: 1, fontSize: TYPE.body }}
    >
      <ListItemIcon sx={{ minWidth: "18px !important" }}>
        {current === side ? <Check size={14} /> : null}
      </ListItemIcon>
      {label}
    </MenuItem>
  ));
}

/**
 * Column header menu: pin the column, pin the ticked rows, autosize, choose columns, Group By and Filter.
 * `menu` is the table's headerContextMenu state ({ top, left, columnKey, pinSide, isGrouped, pinAnchor, rowPinAnchor }).
 */
export function HeaderContextMenu({
  menu, onClose, onOpenPinSubmenu, onOpenRowPinSubmenu, onCloseSubmenus,
  onSetColumnPin, tickedRowCount, pinnedRowCount, tickedRowsPinSide, onSetTickedRowsPin, onUnpinAllRows,
  enableSelection, enableColumnResize, onAutosizeColumn, onAutosizeAllColumns, onChooseColumns,
  canGroup, onGroupBy, onUngroup, onFilter,
}) {
  return (
    <Menu
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: menu.top, left: menu.left }}
      slotProps={{ paper: { className: "min-w-[180px] py-1", sx: menuPaperSx } }}
    >
      {submenuTrigger({
        open: Boolean(menu.pinAnchor),
        onOpen: onOpenPinSubmenu,
        icon: <Pin size={14} style={{ color: "#d97706" }} />,
        label: "Pin column",
        hint: menu.pinSide === "left" ? "Left" : menu.pinSide === "right" ? "Right" : "",
      })}
      <SideSubmenu anchor={menu.pinAnchor} onClose={onCloseSubmenus} minWidthClass="min-w-[130px]">
        {pinChoices({ choices: COLUMN_PIN_CHOICES, current: menu.pinSide, onChoose: (side) => onSetColumnPin(menu.columnKey, side) })}
      </SideSubmenu>
      {/* Pin rows: the ticked rows go to the top or bottom (a single row can also be pinned from its right-click menu). */}
      {submenuTrigger({
        open: Boolean(menu.rowPinAnchor),
        onOpen: onOpenRowPinSubmenu,
        icon: <Pin size={14} style={{ color: "#d97706", transform: "rotate(90deg)" }} />,
        label: "Pin rows",
        hint: tickedRowCount > 0 ? `${tickedRowCount} ticked` : pinnedRowCount > 0 ? `${pinnedRowCount} pinned` : "",
      })}
      <SideSubmenu anchor={menu.rowPinAnchor} onClose={onCloseSubmenus} minWidthClass="min-w-[150px]">
        {tickedRowCount > 0 ? (
          pinChoices({ choices: ROW_PIN_CHOICES, current: tickedRowsPinSide, onChoose: onSetTickedRowsPin })
        ) : (
          <MenuItem disabled sx={{ fontSize: TYPE.small, whiteSpace: "normal", maxWidth: 220 }}>
            {enableSelection ? "Tick the rows to pin, or right-click a row" : "Right-click a row to pin it"}
          </MenuItem>
        )}
        {pinnedRowCount > 0 && <Divider sx={{ my: 0.5 }} />}
        {pinnedRowCount > 0 && (
          <MenuItem onClick={onUnpinAllRows} sx={{ gap: 1, fontSize: TYPE.body }}>
            <ListItemIcon sx={{ minWidth: "18px !important" }} />
            Unpin all rows
          </MenuItem>
        )}
      </SideSubmenu>
      <Divider sx={{ my: 0.5 }} onMouseEnter={onCloseSubmenus} />
      {enableColumnResize && (
        <MenuItem onMouseEnter={onCloseSubmenus} onClick={() => onAutosizeColumn(menu.columnKey)} sx={{ gap: 1, fontSize: TYPE.body }}>
          <MoveHorizontal size={14} style={{ color: "#0d9488" }} />
          Autosize this column
        </MenuItem>
      )}
      {enableColumnResize && (
        <MenuItem onMouseEnter={onCloseSubmenus} onClick={onAutosizeAllColumns} sx={{ gap: 1, fontSize: TYPE.body }}>
          <MoveHorizontal size={14} style={{ color: "#0d9488" }} />
          Autosize all columns
        </MenuItem>
      )}
      <MenuItem onMouseEnter={onCloseSubmenus} onClick={onChooseColumns} sx={{ gap: 1, fontSize: TYPE.body }}>
        <Columns3 size={14} style={{ color: "#64748b" }} />
        Choose columns
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      {(canGroup || menu.isGrouped) && (
        <MenuItem
          onMouseEnter={onCloseSubmenus}
          onClick={() => (menu.isGrouped ? onUngroup() : onGroupBy(menu.columnKey))}
          sx={{ gap: 1, fontSize: TYPE.body }}
        >
          <Filter size={14} style={{ color: "#2563eb" }} />
          {menu.isGrouped ? "Ungroup" : "Group By"}
        </MenuItem>
      )}
      <MenuItem onMouseEnter={onCloseSubmenus} onClick={() => onFilter(menu.columnKey)} sx={{ gap: 1, fontSize: TYPE.body }}>
        <Filter size={14} style={{ color: "#2563eb" }} />
        Filter
      </MenuItem>
    </Menu>
  );
}

/**
 * Row cell menu: pin the row, Filter Out or Show Matching on the cell's value.
 * `menu` is the table's rowContextMenu state ({ top, left, label, displayValue, columnKey, rawValue, row, rowKeyValue, pinSide, pinAnchor }).
 */
export function RowContextMenu({ menu, onClose, onOpenPinSubmenu, onClosePinSubmenu, onSetRowPin, onFilterValue }) {
  return (
    <Menu
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: menu.top, left: menu.left }}
      slotProps={{ paper: { className: "min-w-[220px] py-1", sx: menuPaperSx } }}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1.5, py: 1 }}>
        <Typography sx={{ fontSize: TYPE.small, fontWeight: 600 }}>{menu.label}</Typography>
        <Typography noWrap sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{menu.displayValue}</Typography>
      </Box>
      {submenuTrigger({
        open: Boolean(menu.pinAnchor),
        onOpen: onOpenPinSubmenu,
        icon: <Pin size={14} style={{ color: "#d97706" }} />,
        label: "Pin row",
        hint: menu.pinSide === "top" ? "Top" : menu.pinSide === "bottom" ? "Bottom" : "",
        fontSize: 12,
      })}
      <SideSubmenu anchor={menu.pinAnchor} onClose={onClosePinSubmenu} minWidthClass="min-w-[140px]">
        {pinChoices({ choices: ROW_PIN_CHOICES, current: menu.pinSide, onChoose: (side) => onSetRowPin(menu.rowKeyValue, menu.row, side) })}
      </SideSubmenu>
      <MenuItem onMouseEnter={onClosePinSubmenu} onClick={() => onFilterValue("exclude", menu.columnKey, menu.rawValue)} sx={{ fontSize: 12 }}>
        Filter Out
      </MenuItem>
      <MenuItem onMouseEnter={onClosePinSubmenu} onClick={() => onFilterValue("include", menu.columnKey, menu.rawValue)} sx={{ fontSize: 12 }}>
        Show Matching
      </MenuItem>
    </Menu>
  );
}
