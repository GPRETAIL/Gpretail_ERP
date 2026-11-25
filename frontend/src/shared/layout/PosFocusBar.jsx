import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowLeft, Maximize2, Minimize2, PanelLeft } from "lucide-react";
import useErpFullscreen from "@/shared/hooks/useErpFullscreen";
import useStoreNameMap, { resolveStoreName } from "@/shared/hooks/useStoreNameMap";
import { POS_FOCUS_TITLES } from "./posFocus";

/**
 * Slim top bar for the full-window billing view: leave, where you are (store, counter, cashier), the browser's own full
 * screen, and a way back to the normal menus.
 */
export default function PosFocusBar({ pathname, onShowMenu }) {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const storeNames = useStoreNameMap();
  const { isFullscreen, changing, toggleFullscreen } = useErpFullscreen(() => toast.error("Fullscreen isn't available in this browser/tab."));
  const storeId = sessionStorage.getItem("activeStoreId") || String(authUser?.store_id || authUser?.company_id || "");
  const store = authUser?.company_name || (storeId ? resolveStoreName(storeNames, storeId) : "");
  const details = [store, authUser?.counter_name ? `Counter ${authUser.counter_name}` : "", authUser?.name].filter(Boolean).join("  ·  ");

  return (
    <Stack direction="row" role="banner" aria-label="Billing screen bar" spacing={1.5}
      sx={{ alignItems: "center", flexShrink: 0, px: { xs: 1, md: 2 }, py: 0.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Button size="small" startIcon={<ArrowLeft size={15} />} onClick={() => navigate("/dashboard")} title="Leave billing and go to the dashboard">Exit</Button>
      <Typography component="h1" sx={{ fontSize: 15, fontWeight: 700 }}>{POS_FOCUS_TITLES[pathname] || "Billing"}</Typography>
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, color: "text.secondary" }} noWrap>{details}</Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button size="small" startIcon={isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />} disabled={changing} onClick={toggleFullscreen}
          title={isFullscreen ? "Leave the browser's full screen" : "Use the browser's full screen"}>
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </Button>
        <Button size="small" startIcon={<PanelLeft size={15} />} onClick={onShowMenu} title="Show the side menu and top bar again">Show menu</Button>
      </Box>
    </Stack>
  );
}
