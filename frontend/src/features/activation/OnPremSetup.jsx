import { useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Cloud, Loader2, Server } from "lucide-react";

/**
 * First screen of a fresh on-prem server. Vynerix admin allows one ERP installation per company, so this server
 * is set up from the company's cloud: a cloud administrator signs in once, and the cloud hands over the
 * activation, the store with its licence, the staff accounts and the store's data. The password goes only to
 * this server's configured cloud and is not stored.
 */
export default function OnPremSetup({ cloud, onDone }) {
  const [form, setForm] = useState({ counter_url: window.location.origin, username: "", password: "", store_code: "" });
  const [stores, setStores] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/local-server-config/bootstrap", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, store_code: form.store_code || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setForm((prev) => ({ ...prev, password: "" }));
        setDone(body.message || "This server is set up.");
        return;
      }
      if (body.code === "CHOOSE_STORE" && Array.isArray(body.stores)) {
        setStores(body.stores);
        setError("");
        return;
      }
      setError((body.errors && Object.values(body.errors).flat()[0]) || body.message || "Setup failed. Try again.");
    } catch {
      setError("This server did not answer. Check that it is running, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", px: 2, py: 4 }}>
      <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 460, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper", p: { xs: 3, sm: 4 }, boxShadow: 4 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}><Server size={28} /></Box>
          <Box>
            <Typography sx={{ fontSize: 11, letterSpacing: "0.18em", color: "text.secondary" }}>ON-PREM SERVER</Typography>
            <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700, color: "text.primary" }}>Connect to cloud</Typography>
          </Box>
        </Stack>

        {done ? (
          <>
            <Alert severity="success" sx={{ mt: 2.5 }}>{done}</Alert>
            <Button fullWidth variant="contained" sx={{ mt: 2.5 }} onClick={onDone}>Go to sign in</Button>
          </>
        ) : (
          <>
            <Typography sx={{ mt: 1.5, fontSize: 13, color: "text.secondary" }}>
              This server is new. Sign in with an administrator of your company&apos;s cloud ERP. The store&apos;s data and
              staff accounts are copied here, and counters keep billing on the cloud when this server is down.
            </Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Stack spacing={2} sx={{ mt: 2.5 }}>
              <TextField size="small" label="Cloud" value={cloud || "Not configured"} disabled
                helperText="Set on this server (SYNC_CLOUD_API_BASE_URL)." />
              <TextField size="small" label="Counter address" value={form.counter_url} onChange={set("counter_url")} required
                helperText="The address the billing PCs open, e.g. http://mainserver:5173" />
              <TextField size="small" label="Cloud admin username or email" value={form.username} onChange={set("username")} required autoComplete="username" />
              <TextField size="small" label="Cloud admin password" type="password" value={form.password} onChange={set("password")} required autoComplete="current-password" />
              {stores.length > 0 && (
                <TextField select size="small" label="Store this server runs" value={form.store_code} onChange={set("store_code")} required
                  helperText="This administrator can open several stores. Choose this shop's store.">
                  {stores.map((store) => <MenuItem key={store.code} value={store.code}>{store.name} ({store.code})</MenuItem>)}
                </TextField>
              )}
            </Stack>
            <Button type="submit" fullWidth variant="contained" disabled={busy || !cloud} sx={{ mt: 2.5 }}
              startIcon={busy ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Cloud size={16} />}>
              {busy ? "Connecting and copying..." : "Connect"}
            </Button>
            {busy && (
              <Typography role="status" sx={{ mt: 1.5, fontSize: 12, color: "text.secondary", textAlign: "center" }}>
                Copying the store from the cloud. This can take a few minutes; keep this page open.
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
