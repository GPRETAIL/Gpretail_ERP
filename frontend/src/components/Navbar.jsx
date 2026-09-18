// Navbar.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Bars3Icon,
  BellIcon,
  BuildingStorefrontIcon,
  InboxIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  UserIcon,
  PrinterIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ButtonBase,
  Typography,
  Box,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logoutUser } from "../features/authSlice";
import { useTheme } from "../features/theme-context";
import api from "../api/axios";
import { useTabs } from "../context/TabContext";
import { usePrintContext } from "../context/PrintContext";
import { savePrinterRouting } from "../utils/localPrinterService";
import CounterAssignmentDialog from "./CounterAssignmentDialog";
import { navItems, ownerNavItems } from "../utils/navItems";
import { getVisibleNavItems } from "../utils/accessControl";

const PRINTER_FUNCTION_OPTIONS = [
  { value: "", label: "Select function" },
  { value: "barcode", label: "Barcode" },
  { value: "receipt", label: "Receipt" },
  { value: "a4", label: "A4 size" },
];

// Pseudo store id for the "All Stores" checkbox in the Switch Store dialog -- never sent to the
// backend, only used to decide locally whether to clear the active store or set one.
const ALL_STORES_ID = "__all__";

const Navbar = ({ sidebarExpanded, isMobile = false, toggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activeTabPath, navigateActiveTab } = useTabs();
  const { printer, sessionConnected, connectPrinter } = usePrintContext();
  const [imageError, setImageError] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [savingPrinterAssignments, setSavingPrinterAssignments] = useState(false);
  const [printerAssignments, setPrinterAssignments] = useState({});
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeOptions, setStoreOptions] = useState([]);
  const { user } = useSelector((state) => state.auth);
  // Checkbox selection in the Switch Store dialog. ALL_STORES_ID is a pseudo-entry alongside real
  // store ids in the same Set, not a separate boolean -- keeps "checking All Stores clears specific
  // picks" and "picking a specific store clears All Stores" as one rule instead of two states that
  // could drift out of sync.
  const [selectedStoreIds, setSelectedStoreIds] = useState(() => new Set());
  const { theme, setTheme } = useTheme();

  const isApprovalInboxRoute = String(activeTabPath || "").startsWith("/sales/approval-inbox");
  const isOwner = String(user?.role || "").toLowerCase() === "owner";

  // The Settings menu item below used to hardcode "/settings/company", but that page is gated to
  // isSuperAdmin only (see accessControl.js) -- for every other role it silently bounced back to
  // /dashboard via ProtectedRoute with no explanation, looking exactly like a dead/broken link.
  // Mirror the Sidebar's own capability filtering (getVisibleNavItems) so the click always lands
  // on the first Settings sub-page this user can actually open, and hide the item entirely when
  // they can't open any of them.
  const settingsLandingPath = useMemo(() => {
    const sourceNavItems = isOwner ? ownerNavItems : navItems;
    const settingsModule = getVisibleNavItems(sourceNavItems, user).find((item) => item.name === "Settings");
    return settingsModule?.subItems?.[0]?.path || null;
  }, [isOwner, user]);
  const isSuperAdmin = String(user?.role || "").toLowerCase() === "super_admin";
  // A manager/user provisioned with 2+ stores (Company multi-select or a Store Group on the User
  // Access page) gets the same switcher a super-admin does -- company_ids is the tenant admin's
  // FULL grant for this account, sent on every login (see SanitizedUserResponse), not just their
  // one default store.
  const hasMultipleStores = Array.isArray(user?.company_ids) && user.company_ids.length > 1;
  const canSwitchStore = isSuperAdmin || hasMultipleStores;

  // Tracks the real browser fullscreen state (not just "did we click the button") so the icon
  // stays correct if the user exits with Esc or a browser control instead of clicking it again.
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {
        toast.error("Fullscreen isn't available in this browser/tab.");
      });
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate(String(user?.role || "").toLowerCase() === "owner" ? "/owner/login" : "/login", { replace: true });
  };

  // ✅ Provide fallback values
  const userName = user?.name || "Guest User";
  const userPicture = user?.picture || "https://i.pravatar.cc/150?img=68";

  const handleImageError = () => {
    setImageError(true);
  };

  // Use fallback if image fails to load
  const displayImage = imageError
    ? "https://i.pravatar.cc/150?img=68"
    : userPicture;

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const closeMenu = () => setAnchorEl(null);

  const selectedPrinterNames = useMemo(() => {
    const primary = String(printer?.selectedPrinterName || "").trim();
    const names = Array.isArray(printer?.selectedPrinterNames) ? printer.selectedPrinterNames : [];
    return Array.from(
      new Set(
        [...names, primary]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
  }, [printer?.selectedPrinterName, printer?.selectedPrinterNames]);

  const selectedPrinterNameSet = useMemo(
    () => new Set(selectedPrinterNames.map((value) => value.toLowerCase())),
    [selectedPrinterNames]
  );

  const printerRoutes = Array.isArray(printer?.printerRoutes) ? printer.printerRoutes : [];
  const connectorPrinters = Array.isArray(printer?.printers) ? printer.printers : [];
  const currentUserId =
    user?.id === undefined || user?.id === null || user?.id === ""
      ? null
      : Number(user.id) || null;
  const currentUserName = String(user?.name || "").trim().toLowerCase();

  const isRouteOwnedByCurrentUser = (route) => {
    if (currentUserId && Number(route?.user_id) === currentUserId) return true;
    if (
      currentUserName &&
      String(route?.user_name || "")
        .trim()
        .toLowerCase() === currentUserName
    ) {
      return true;
    }
    return false;
  };

  const isRouteAssignedToAnyUser = (route) =>
    Boolean(
      (route?.user_id !== undefined && route?.user_id !== null && route?.user_id !== "") ||
        String(route?.user_name || "").trim()
    );

  const normalizePrinterName = (printerRow) =>
    String(
      typeof printerRow === "string" ? printerRow : printerRow?.name || printerRow?.PrinterName || ""
    ).trim();

  const availableSelfAssignmentPrinters = useMemo(() => {
    return connectorPrinters
      .map((printerRow) => {
        const name = normalizePrinterName(printerRow);
        if (!name || !selectedPrinterNameSet.has(name.toLowerCase())) return null;
        const route =
          printerRoutes.find(
            (entry) =>
              String(entry?.printer_name || "")
                .trim()
                .toLowerCase() === name.toLowerCase()
          ) || null;
        const ownedByCurrentUser = route ? isRouteOwnedByCurrentUser(route) : false;
        const assignedToOtherUser =
          route && isRouteAssignedToAnyUser(route) && !ownedByCurrentUser;
        if (assignedToOtherUser) return null;
        return {
          name,
          route,
          ownedByCurrentUser,
          type:
            typeof printerRow === "string"
              ? "Unknown"
              : printerRow?.connectionType || printerRow?.ConnectionType || "Local",
        };
      })
      .filter(Boolean);
  }, [connectorPrinters, printerRoutes, selectedPrinterNameSet]);

  useEffect(() => {
    if (!printerDialogOpen) return;
    const nextAssignments = {};
    availableSelfAssignmentPrinters.forEach(({ name, route, ownedByCurrentUser }) => {
      nextAssignments[name] = {
        printer_name: name,
        printer_function: ownedByCurrentUser ? String(route?.printer_function || "").trim().toLowerCase() : "",
        checked: ownedByCurrentUser,
      };
    });
    setPrinterAssignments(nextAssignments);
  }, [availableSelfAssignmentPrinters, printerDialogOpen]);

  useEffect(() => {
    if (!isApprovalInboxRoute) {
      return undefined;
    }

    let active = true;

    const loadPendingApprovals = async () => {
      try {
        const res = await api.get("/sales-on-approval/pending-count");
        if (!active) return;
        const count = Number(res.data?.data?.count);
        setPendingApprovalsCount(Number.isFinite(count) ? count : 0);
      } catch {
        if (active) setPendingApprovalsCount(0);
      }
    };

    loadPendingApprovals();
    const intervalId = setInterval(loadPendingApprovals, 30000);
    const onApprovalUpdated = () => loadPendingApprovals();
    window.addEventListener("sales-on-approval-updated", onApprovalUpdated);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener("sales-on-approval-updated", onApprovalUpdated);
    };
  }, [isApprovalInboxRoute]);

  // Global bell badge - unlike Approval Inbox's count (only polled while on
  // that page), this polls everywhere so the badge is always current.
  useEffect(() => {
    let active = true;

    const loadUnreadCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        if (!active) return;
        const count = Number(res.data?.data?.count);
        setUnreadNotifCount(Number.isFinite(count) ? count : 0);
      } catch {
        if (active) setUnreadNotifCount(0);
      }
    };

    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const openNotifMenu = async (event) => {
    setNotifAnchorEl(event.currentTarget);
    setNotifLoading(true);
    try {
      const res = await api.get("/notifications");
      const list = res.data?.data || [];
      // Computed once here (at fetch time), not during render, per this
      // project's React Compiler purity rule against Date.now() in JSX.
      setNotifications(list.map((n) => ({ ...n, _timeAgo: notifTimeAgo(n.created_at) })));
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const closeNotifMenu = () => setNotifAnchorEl(null);

  const handleNotificationClick = async (notification) => {
    closeNotifMenu();
    try {
      await api.post(`/notifications/${notification.id}/read`);
    } catch {
      // Navigation should still proceed even if marking read fails.
    }
    setUnreadNotifCount((prev) => Math.max(0, prev - (notification.read_at ? 0 : 1)));
    if (notification.link) {
      navigateActiveTab(notification.link);
    }
  };

  const notifTimeAgo = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days >= 1) return `${days}d ago`;
    const hours = Math.floor(diffMs / 3600000);
    if (hours >= 1) return `${hours}h ago`;
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    return `${mins}m ago`;
  };

  const openPrinterDialog = async () => {
    closeMenu();
    setPrinterDialogOpen(true);
    if (sessionConnected) return;
    try {
      await connectPrinter({ silent: true });
    } catch (err) {
      toast.error(
        err?.message ||
          "Printer connector is not connected. Run the connector and connect it in Printing Configuration."
      );
    }
  };

  const openCounterDialog = () => {
    closeMenu();
    setCounterDialogOpen(true);
  };

  const handlePrinterAssignmentToggle = (printerName, checked) => {
    setPrinterAssignments((prev) => {
      const current = prev[printerName] || {
        printer_name: printerName,
        printer_function: "",
        checked: false,
      };
      if (checked && !current.printer_function) {
        toast.info("Select printer function first.");
        return prev;
      }
      return {
        ...prev,
        [printerName]: {
          ...current,
          checked,
        },
      };
    });
  };

  const handlePrinterFunctionChange = (printerName, printerFunction) => {
    setPrinterAssignments((prev) => ({
      ...prev,
      [printerName]: {
        printer_name: printerName,
        checked: Boolean(prev[printerName]?.checked),
        ...prev[printerName],
        printer_function: String(printerFunction || "").trim().toLowerCase(),
      },
    }));
  };

  const handleSavePrinterAssignments = async () => {
    if (!sessionConnected) {
      toast.error("Printer connector is not connected.");
      return;
    }

    const visibleByName = new Map(
      availableSelfAssignmentPrinters.map((entry) => [entry.name.toLowerCase(), entry])
    );
    const checkedAssignments = Object.values(printerAssignments).filter((entry) => entry?.checked);
    const missingFunction = checkedAssignments.find((entry) => !String(entry?.printer_function || "").trim());
    if (missingFunction) {
      toast.error(`Select printer function for ${missingFunction.printer_name}.`);
      return;
    }

    const duplicateFunction = checkedAssignments
      .map((entry) => String(entry?.printer_function || "").trim().toLowerCase())
      .filter(Boolean)
      .find((printerFunction, index, arr) => arr.indexOf(printerFunction) !== index);
    if (duplicateFunction) {
      toast.error("Only one printer per function can be assigned to your user.");
      return;
    }

    setSavingPrinterAssignments(true);
    try {
      const nextRoutes = printerRoutes.filter((route) => {
        const routePrinterName = String(route?.printer_name || "").trim().toLowerCase();
        const visibleEntry = visibleByName.get(routePrinterName);
        if (!visibleEntry) return true;
        return !visibleEntry.ownedByCurrentUser;
      });

      availableSelfAssignmentPrinters.forEach(({ name, route, ownedByCurrentUser }) => {
        const draft = printerAssignments[name] || {
          printer_name: name,
          printer_function: "",
          checked: false,
        };

        if (draft.checked) {
          nextRoutes.push({
            printer_name: name,
            printer_function: String(draft.printer_function || "").trim().toLowerCase(),
            user_id: currentUserId,
            user_name: String(user?.name || "").trim(),
          });
          return;
        }

        if (!ownedByCurrentUser && route) {
          nextRoutes.push(route);
        }
      });

      await savePrinterRouting(nextRoutes);
      await connectPrinter({ silent: true });
      toast.success("Your printer assignments were updated.");
      setPrinterDialogOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save printer assignments.");
    } finally {
      setSavingPrinterAssignments(false);
    }
  };


  const openStoreDialog = async () => {
    closeMenu();
    setStoreDialogOpen(true);
    setLoadingStores(true);
    try {
      const res = await api.get("/companies", { params: { limit: 500 } });
      const list = (res.data?.data || []).map((c) => ({
        value: String(c.id),
        label: c.name || c.code || `Store ${c.id}`,
      }));
      setStoreOptions(list);
      // No active store saved = the existing "read everything" default, i.e. All Stores. A saved
      // id only pre-checks that one store if it's still in the fetched list (a deleted/stale store
      // falls back to All Stores rather than pre-checking something no longer selectable).
      const activeStoreId = localStorage.getItem("activeStoreId");
      setSelectedStoreIds(
        activeStoreId && list.some((option) => option.value === activeStoreId)
          ? new Set([activeStoreId])
          : new Set([ALL_STORES_ID])
      );
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoadingStores(false);
    }
  };

  // Lets the footer's "All Stores" indicator (MainLayout.jsx, a sibling far outside this component's
  // own tree) open this SAME dialog instead of duplicating the fetch/selection logic above. A plain
  // window event is the least invasive bridge here -- promoting storeDialogOpen and its handlers into
  // a shared context would work too, but only this one caller needs it today.
  useEffect(() => {
    if (!canSwitchStore) return undefined;
    const handler = () => openStoreDialog();
    window.addEventListener("vx:open-store-switch", handler);
    return () => window.removeEventListener("vx:open-store-switch", handler);
  }, [canSwitchStore]);

  const toggleStoreSelection = (id) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (id === ALL_STORES_ID) {
        // Toggling All Stores always replaces whatever specific picks existed -- the two are
        // mutually exclusive, not additive.
        return next.has(ALL_STORES_ID) ? new Set() : new Set([ALL_STORES_ID]);
      }
      next.delete(ALL_STORES_ID);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveStoreSwitch = () => {
    const specificIds = [...selectedStoreIds].filter((id) => id !== ALL_STORES_ID);
    // All Stores checked, nothing checked, or several stores checked all resolve the same way:
    // clear the switch and read unrestricted across the whole tenant -- the same default that
    // already applies whenever no store is actively switched. A write still needs exactly one
    // store, same as always (StoreAssignment 422s "Select a store first" if it can't tell which).
    if (selectedStoreIds.has(ALL_STORES_ID) || specificIds.length !== 1) {
      localStorage.removeItem("activeStoreId");
      toast.success("Now viewing all your stores");
    } else {
      localStorage.setItem("activeStoreId", specificIds[0]);
      const label = storeOptions.find((option) => option.value === specificIds[0])?.label || "the selected store";
      toast.success(`Switched active store context to ${label}`);
    }
    setStoreDialogOpen(false);
    window.location.reload();
  };

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar
          variant="dense"
          disableGutters
          sx={{ minHeight: 40, px: { xs: 1.5, md: 3 }, justifyContent: "space-between" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Hamburger menu on mobile */}
            {isMobile && (
              <IconButton
                size="small"
                onClick={toggleSidebar}
                aria-label="Open menu"
                sx={{ color: "text.secondary" }}
              >
                <Bars3Icon className="w-5 h-5" />
              </IconButton>
            )}
            {(!sidebarExpanded || isMobile) ? (
              <Typography
                component="span"
                sx={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", userSelect: "none" }}
              >
                <Box
                  component="span"
                  sx={{
                    background: "linear-gradient(to right, #2563eb, #0ea5e9, #22d3ee)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Vyn
                </Box>
                <Box component="span" sx={{ color: "text.primary" }}>
                  erix
                </Box>
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* 🌙 / ☀️ DARK MODE TOGGLE */}
            <IconButton
              size="small"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              sx={{ color: "text.secondary" }}
            >
              <span className="text-base">{theme === "dark" ? "☀️" : "🌙"}</span>
            </IconButton>

            <IconButton
              size="small"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit full screen" : "Full screen"}
              sx={{ color: "text.secondary" }}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </IconButton>

            {!isOwner ? (
              <IconButton
                size="small"
                onClick={() => navigateActiveTab("/sales/approval-inbox")}
                title="Approval Inbox"
                sx={{ color: "text.secondary" }}
              >
                <Badge badgeContent={pendingApprovalsCount} color="error" showZero overlap="circular">
                  <InboxIcon className="w-5 h-5" />
                </Badge>
              </IconButton>
            ) : null}

            {/* 🔔 Notification Button */}
            <IconButton size="small" onClick={openNotifMenu} title="Notifications" sx={{ color: "text.secondary" }}>
              <Badge badgeContent={unreadNotifCount} color="error" showZero={false} overlap="circular">
                <BellIcon className="w-5 h-5" />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={closeNotifMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { width: 340, maxHeight: 420 } } }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Notifications</Typography>
              </Box>
              {notifLoading ? (
                <MenuItem disabled>
                  <ListItemText primary="Loading..." />
                </MenuItem>
              ) : notifications.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText primary="No notifications" />
                </MenuItem>
              ) : (
                notifications.map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1 }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: n.read_at ? 500 : 700 }}>
                          {n.title}
                        </Typography>
                        {!n.read_at && (
                          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "error.main", mt: 0.6, flexShrink: 0 }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.25 }}>
                        {n.message}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: "text.disabled", mt: 0.25 }}>
                        {n._timeAgo}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>

            {/* USER DROPDOWN */}
            <ButtonBase
              onClick={(event) => setAnchorEl(event.currentTarget)}
              sx={{
                display: "flex", alignItems: "center", gap: 1, p: 0.5, borderRadius: 2,
                transition: "background-color 0.15s ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box
                component="img"
                src={displayImage}
                alt={userName}
                onError={handleImageError}
                referrerPolicy="no-referrer"
                sx={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid", borderColor: "divider" }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.secondary", display: { xs: "none", sm: "inline" } }}>
                {userName}
              </Typography>
            </ButtonBase>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={closeMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { minWidth: 208, mt: 1 } } }}
            >
              <MenuItem
                onClick={() => {
                  closeMenu();
                  navigateActiveTab("/profile");
                }}
              >
                <ListItemIcon>
                  <UserIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>

              <MenuItem onClick={openPrinterDialog}>
                <ListItemIcon>
                  <PrinterIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Printer</ListItemText>
              </MenuItem>

              <MenuItem onClick={openCounterDialog}>
                <ListItemIcon>
                  <BuildingStorefrontIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Counter</ListItemText>
              </MenuItem>

              {canSwitchStore && (
                <MenuItem onClick={openStoreDialog} sx={{ color: "primary.main", fontWeight: 500 }}>
                  <ListItemIcon sx={{ color: "inherit" }}>
                    <BuildingStorefrontIcon className="w-5 h-5" />
                  </ListItemIcon>
                  <ListItemText>Switch Store</ListItemText>
                </MenuItem>
              )}

              {/* Only shown when the user can actually open at least one Settings sub-page --
                  settingsLandingPath is null otherwise, matching the Sidebar's own filtering. */}
              {settingsLandingPath && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    navigateActiveTab(settingsLandingPath);
                  }}
                >
                  <ListItemIcon>
                    <Cog6ToothIcon className="w-5 h-5" />
                  </ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  closeMenu();
                  navigateActiveTab("/app/");
                }}
              >
                <ListItemIcon>
                  <DevicePhoneMobileIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Mobile Workspace</ListItemText>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  closeMenu();
                  window.dispatchEvent(new CustomEvent("pwa-show-install-prompt"));
                }}
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                <ListItemIcon sx={{ color: "inherit" }}>
                  <DevicePhoneMobileIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Install Mobile App</ListItemText>
              </MenuItem>

              <Divider />

              <MenuItem
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon sx={{ color: "inherit" }}>
                  <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Dialog open={printerDialogOpen} onClose={() => setPrinterDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              My Printers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Assign yourself from connector-selected printers that are unassigned or already assigned to you.
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setPrinterDialogOpen(false)} aria-label="Close printer dialog">
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!sessionConnected ? (
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              Printer connector is not connected on this machine. Run the connector and connect it first.
            </Alert>
          ) : selectedPrinterNames.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              No printers are selected in the connector yet. Run `run.bat` and choose printers first.
            </Alert>
          ) : availableSelfAssignmentPrinters.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              No connector printers are available for your user right now.
            </Alert>
          ) : (
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Printer Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Function</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Assign</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableSelfAssignmentPrinters.map(({ name }) => {
                    const draft = printerAssignments[name] || {
                      printer_name: name,
                      printer_function: "",
                      checked: false,
                    };
                    return (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={draft.printer_function}
                            onChange={(event) => handlePrinterFunctionChange(name, event.target.value)}
                            displayEmpty
                            fullWidth
                          >
                            {PRINTER_FUNCTION_OPTIONS.map((option) => (
                              <MenuItem key={option.value || "blank"} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                              <Checkbox
                                size="small"
                                checked={Boolean(draft.checked)}
                                onChange={(event) => handlePrinterAssignmentToggle(name, event.target.checked)}
                              />
                            }
                            label={<Typography sx={{ fontSize: 13 }}>Assigned</Typography>}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={() => setPrinterDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePrinterAssignments}
            disabled={!sessionConnected || savingPrinterAssignments || availableSelfAssignmentPrinters.length === 0}
          >
            {savingPrinterAssignments ? "Saving..." : "Save Printers"}
          </Button>
        </DialogActions>
      </Dialog>

      <CounterAssignmentDialog
        open={counterDialogOpen}
        onClose={() => setCounterDialogOpen(false)}
      />

      <Dialog open={storeDialogOpen} onClose={() => setStoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ color: "primary.main", display: "inline-flex" }}>
                <BuildingStorefrontIcon className="w-5 h-5" />
              </Box>
              Switch Active Store Scope
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Select a store to manage data (create, view, edit, delete) directly within that store scope.
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setStoreDialogOpen(false)} aria-label="Close store dialog">
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loadingStores ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Loading available stores...
            </Alert>
          ) : (
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Active Store Location</Typography>
              <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                Pick exactly one store to create/edit data there. All Stores or multiple stores
                together only let you view combined data across them.
              </Typography>
              <Box sx={{ maxHeight: 256, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1.5, p: 1 }}>
                <FormControlLabel
                  sx={{ display: "flex", mx: 0, borderRadius: 1, px: 1, py: 0.5, "&:hover": { bgcolor: "action.hover" } }}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedStoreIds.has(ALL_STORES_ID)}
                      onChange={() => toggleStoreSelection(ALL_STORES_ID)}
                    />
                  }
                  label={<Typography sx={{ fontSize: 13 }}>All Stores</Typography>}
                />
                {storeOptions.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    sx={{ display: "flex", mx: 0, borderRadius: 1, px: 1, py: 0.5, "&:hover": { bgcolor: "action.hover" } }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedStoreIds.has(option.value)}
                        onChange={() => toggleStoreSelection(option.value)}
                      />
                    }
                    label={<Typography sx={{ fontSize: 13 }}>{option.label}</Typography>}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={() => setStoreDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveStoreSwitch}
            disabled={loadingStores || selectedStoreIds.size === 0}
          >
            Switch Store
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;
