import { setActiveStoreSelection } from "../utils/storeSelection";
import React, { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import api from "../api/axios";

/** Used on desktop and mobile when the backend refuses an unscoped write. Never retries a write. */
export default function StoreSelectionDialog() {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const show = async () => {
      setOpen(true);
      setSelected("");
      setError("");
      setLoading(true);
      try {
        const response = await api.get("/companies", { params: { limit: 500 } });
        if (mounted) setStores(response.data?.data || []);
      } catch {
        if (mounted) setError("Unable to load your stores. Close this window and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    window.addEventListener("vx:store-selection-required", show);
    return () => {
      mounted = false;
      window.removeEventListener("vx:store-selection-required", show);
    };
  }, []);

  const select = () => {
    if (!stores.some((store) => String(store.id) === selected && store.active !== false && store.is_active !== false)) return;
    setActiveStoreSelection(selected);
    // Reopen the form after selecting. Never silently resubmit a failed transaction into another store.
    window.location.reload();
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Select a store</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>Your data has not been saved. Select a store, then reopen the form. Unsaved form entries will be cleared.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && stores.length === 0 && <Alert severity="warning">Ask your administrator to assign and activate a store.</Alert>}
        <TextField select label="Store" fullWidth value={selected} onChange={(event) => setSelected(event.target.value)} disabled={loading || stores.length === 0}>
          {stores.map((store) => <MenuItem key={store.id} value={String(store.id)} disabled={store.active === false || store.is_active === false}>{store.name || store.code}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={!selected || loading} onClick={select}>Select and reopen</Button>
      </DialogActions>
    </Dialog>
  );
}
