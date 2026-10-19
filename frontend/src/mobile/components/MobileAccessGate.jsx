import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import api from "../../api/axios";
import { logoutUser } from "../../features/authSlice";
import useAsyncQuery from "../../hooks/useAsyncQuery";
import VynerixLoginBrand from "../../components/auth/VynerixLoginBrand";
import NotificationsModal from "./NotificationsModal";
import { MobileAccessContext } from "../utils/mobileAccessContext";

export default function MobileAccessGate({ children }) {
  const dispatch = useDispatch();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [storeId, setStoreId] = useState(() => sessionStorage.getItem("activeStoreId") || "");
  const fetchAccess = useCallback(async ({ signal }) => (await api.get("/mobile/access", { signal })).data.data, []);
  const { data, error, loading, reload } = useAsyncQuery(fetchAccess);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== "hidden") reload({ silent: true }); };
    const timer = setInterval(refresh, 5 * 60 * 1000);
    window.addEventListener("online", refresh);
    window.addEventListener("vx-pull-refresh", refresh);
    window.addEventListener("vx:mobile-access-denied", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("vx-pull-refresh", refresh);
      window.removeEventListener("vx:mobile-access-denied", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  const stores = data?.stores || [];
  const selected = stores.find(store => String(store.id) === String(storeId)) || (stores.length === 1 ? stores[0] : null);
  useEffect(() => {
    if (selected) sessionStorage.setItem("activeStoreId", String(selected.id));
  }, [selected]);
  const selectStore = event => {
    sessionStorage.setItem("activeStoreId", String(event.target.value));
    setStoreId(String(event.target.value));
  };
  if (!loading && !error && data?.mobile_session && selected?.allowed) {
    return <MobileAccessContext.Provider value={{ screens: selected.screens, store: selected, portalUrl: data.portal_url }}>{children}</MobileAccessContext.Provider>;
  }
  return <Box className="vx-workspace" sx={{ minHeight: "100vh", bgcolor: "#f8fafc", display: "grid", placeItems: "center", p: 2 }}>
    <Stack spacing={2} sx={{ width: "100%", maxWidth: 440, bgcolor: "#fff", p: 3, border: "1px solid #e2e8f0", borderRadius: 3 }}>
      <VynerixLoginBrand onLight />
      <Typography variant="h5" color="#0f172a">Mobile access</Typography>
      {loading ? <CircularProgress size={24} /> : error ? <Alert severity="warning">Unable to validate access. Connect to your ERP server and retry. Existing on-premises licences can validate locally while the internet is unavailable.</Alert> : <>
        {stores.length > 1 && <TextField select label="Select a store" value={selected ? String(selected.id) : ""} onChange={selectStore}>
          {stores.map(store => <MenuItem key={store.id} value={String(store.id)}>{store.name} · {store.allowed ? "Mobile enabled" : "Access unavailable"}</MenuItem>)}
        </TextField>}
        <Alert severity="info">{!stores.length ? "No stores are available. Create and activate a store before using the mobile app."
          : !selected ? "Choose one store to validate its subscription and your access."
            : selected.reason === "MOBILE_USER_ACCESS_DENIED" ? "Your administrator has not granted mobile access to your account."
              : selected.reason === "MOBILE_SUBSCRIPTION_REQUIRED" ? "This store's subscription does not include mobile access."
                : "This store needs an active subscription and activation before mobile access is available."}</Alert>
        {selected?.plan && <Typography color="#475569" fontSize={13}>Plan: {selected.plan} · Expires: {selected.expires_at ? new Date(selected.expires_at).toLocaleDateString() : "Not activated"}</Typography>}
        {data?.tenant_admin ? <>
          <Button variant="contained" href={data.portal_url || "https://company.gpsoftware.in/login"}>Purchase or manage subscription</Button>
          <Button href="/store-activation">Refresh or activate stores</Button>
        </> : <Typography color="#475569" fontSize={13}>Contact your Tenant Administrator to enable access or renew the store subscription.</Typography>}
      </>}
      <Button onClick={() => setInboxOpen(true)}>Account notifications</Button>
      <NotificationsModal isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
      <Button onClick={() => reload()}>Check access again</Button>
      <Button onClick={() => dispatch(logoutUser())}>Sign out</Button>
    </Stack>
  </Box>;
}
