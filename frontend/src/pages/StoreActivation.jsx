import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Box, Button, Chip, Divider, Paper, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { Building2, KeyRound, RefreshCw, ShieldCheck, Store, Warehouse } from "lucide-react";
import PageHeader from "../components/PageHeader";
import useAsyncQuery from "../hooks/useAsyncQuery";
import checkAuth from "../utils/checkAuth";
import api from "../api/axios";

const statusColors = { Activated: "success", "Pending activation": "warning", Inactive: "default", "Subscription expired": "error" };

export default function StoreActivation() {
  const dispatch = useDispatch();
  const activationInput = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [code, setCode] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fetchStores = useCallback(async ({ signal } = {}) => {
    const response = await api.get("/company-stores", { signal });
    const now = Date.now();
    const stores = Array.isArray(response.data?.data) ? response.data.data : [];
    return {
      stores: stores.map(store => ({ ...store, activationStatus: !store.activated_at ? "Pending activation"
        : store.is_active === false || store.is_active === 0 ? "Inactive"
        : store.platform_active_till && Date.parse(store.platform_active_till) <= now ? "Subscription expired" : "Activated" })),
      warehouses: Array.isArray(response.data?.warehouses) ? response.data.warehouses : [],
    };
  }, []);
  const applyStores = useCallback(data => { setSnapshot(data); setError(""); }, []);
  const { loading, reload } = useAsyncQuery(fetchStores, {
    onSuccess: applyStores,
    onError: e => setError(e.response?.data?.message || "Could not load stores. Please retry."),
  });
  const stores = snapshot?.stores || [];
  const warehouses = snapshot?.warehouses || [];
  const run = async activate => {
    if (busy) return;
    setBusy(activate ? "activate" : "sync"); setError(""); setMessage("");
    let activated = false;
    try {
      const value = code.trim();
      const payload = value.toUpperCase().startsWith("GPR-")
        ? { license_key: value, ...(storeCode.trim() ? { store_code: storeCode.trim() } : {}) }
        : { store_code: storeCode.trim(), activation_code: value };
      const response = await api.post(activate ? "/company-stores/activate" : "/company-stores/sync", activate ? payload : {});
      activated = activate;
      // Once accepted, the one-use code must not be offered for a second submission if refresh fails.
      if (activate) setCode("");
      applyStores(await fetchStores());
      await checkAuth(dispatch);
      setMessage(response.data?.message || "Stores refreshed from Vynerix Admin.");
    } catch (e) {
      setError(activated ? "Store activated, but the ERP list could not refresh. Use Refresh from Vynerix Admin to recover."
        : e.response?.data?.message || "Could not reach Vynerix Admin. Please retry.");
    } finally { setBusy(""); }
  };
  const handleCodeChange = e => {
    const value = e.target.value;
    setCode(value);
    if (value.trim().toUpperCase().startsWith("GPR-")) {
      try {
        const raw = value.trim().substring(4).replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(raw));
        if (typeof decoded.s === "string") setStoreCode(decoded.s);
      } catch { /* The server validates the key when submitted. */ }
    }
  };
  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
    <PageHeader title="Store Activation" actions={<Button size="small" startIcon={<RefreshCw size={15} />} onClick={() => run(false)} disabled={Boolean(busy) || loading}>{busy === "sync" ? "Refreshing…" : "Refresh from Vynerix Admin"}</Button>} />
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: { xs: 1.5, sm: 2 } }}>
      <Stack spacing={2} sx={{ maxWidth: 1200, mx: "auto" }}>
        <Typography variant="body2" color="text.secondary">Connect the stores provisioned for your company in Vynerix Admin, then activate each branch using its welcome email.</Typography>
        {error && <Alert severity="error" action={!busy && <Button color="inherit" size="small" onClick={() => { setError(""); reload(); }}>Reload list</Button>}>{error}</Alert>}
        {message && <Alert severity="success" role="status">{message}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
          {[{ label: "Provisioned stores", count: stores.length, Icon: Store }, { label: "Active stores", count: stores.filter(store => store.activationStatus === "Activated").length, Icon: ShieldCheck }, { label: "Warehouses", count: warehouses.length, Icon: Warehouse }].map(({ label, count, Icon }) => <Paper key={label} variant="outlined" sx={{ p: 1.75, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ color: "primary.main", display: "flex" }}><Icon size={21} /></Box><Box><Typography variant="caption" color="text.secondary">{label}</Typography>{loading ? <Skeleton width={40} /> : <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{snapshot ? count : "—"}</Typography>}</Box></Paper>)}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(300px, 0.8fr) minmax(0, 1.2fr)" }, gap: 2, alignItems: "start" }}>
          <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}><KeyRound size={19} /><Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>Activate a store</Typography></Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Paste the Store License Key from your welcome email, or enter the Store Code and one-use activation code.</Typography>
            <Stack component="form" spacing={2} onSubmit={e => { e.preventDefault(); run(true); }}>
              <TextField label="Store code" size="small" value={storeCode} onChange={e => setStoreCode(e.target.value)} disabled={Boolean(busy)} helperText="For example, STR- followed by your branch code" required />
              <TextField label="Activation code or License Key" size="small" inputRef={activationInput} autoComplete="off" value={code} onChange={handleCodeChange} disabled={Boolean(busy)} placeholder="GPR- license key or activation code" helperText="A Store License Key fills the store code automatically." required />
              <Button type="submit" variant="contained" disabled={Boolean(busy) || loading}>{busy === "activate" ? "Activating…" : "Activate store"}</Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">The one-use activation code is consumed on activation. Later plan or subscription changes are retrieved with Refresh from Vynerix Admin.</Typography>
          </Paper>
          <Stack spacing={2}>
            <Paper component="section" variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}><Building2 size={19} /><Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>Your stores</Typography></Stack>
              {loading ? <Stack spacing={1}>{[0, 1].map(id => <Skeleton key={id} variant="rounded" height={110} />)}</Stack> : !error && !stores.length ? <Alert severity="info">No stores have been provisioned. Create a store in Vynerix Admin, then refresh this list.</Alert> : <Stack spacing={1.25}>{stores.map(store => <Box component="article" key={store.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 2, overflowWrap: "anywhere" }}>
                <Stack direction="row" useFlexGap spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}><Box><Typography component="h3" sx={{ fontSize: 14, fontWeight: 600 }}>{store.name}</Typography><Typography variant="caption" color="text.secondary">{store.code}</Typography></Box><Chip size="small" variant="outlined" color={statusColors[store.activationStatus]} label={store.activationStatus} /></Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Plan: {store.platform_subscription?.plan_name || "Trial"} · Expires: {store.platform_active_till ? new Date(store.platform_active_till).toLocaleDateString() : "Starts on activation"}</Typography>
                {!store.activated_at && <Button size="small" disabled={Boolean(busy)} onClick={() => { setStoreCode(store.code); activationInput.current?.focus(); }}>Activate this store</Button>}
              </Box>)}</Stack>}
            </Paper>
            {warehouses.length > 0 && <Paper component="section" variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}><Warehouse size={19} /><Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>Warehouses</Typography></Stack>
              <Stack spacing={1.25}>{warehouses.map(warehouse => <Box component="article" key={warehouse.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 2, overflowWrap: "anywhere" }}><Typography component="h3" sx={{ fontSize: 14, fontWeight: 600 }}>{warehouse.name}</Typography><Typography variant="caption" color="text.secondary">{warehouse.code}</Typography><Typography variant="body2" sx={{ mt: 0.5 }}>{warehouse.is_active ? "Available" : "Waiting for an active parent store"} · Store: {stores.find(store => String(store.id) === String(warehouse.store_id))?.name || "Not assigned"}</Typography></Box>)}</Stack>
            </Paper>}
          </Stack>
        </Box>
      </Stack>
    </Box>
  </Box>;
}
