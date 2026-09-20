import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import api from "../api/axios";

// Module-scope cache: every report page shares one companies fetch per session.
let cachedStores = null;
let inflight = null;

const loadStores = () => {
  if (cachedStores) return Promise.resolve(cachedStores);
  if (!inflight) {
    inflight = api
      .get("/companies", { params: { limit: 500 } })
      .then((res) => {
        cachedStores = res.data?.data || [];
        return cachedStores;
      })
      .catch(() => {
        inflight = null;
        return [];
      });
  }
  return inflight;
};

/**
 * Store filter for report screens. Renders only for the super admin, who may narrow a
 * report to a single store or leave it on "All Stores" for the consolidated view.
 * Store users never see it — the backend pins them to their own store regardless.
 */
const StoreFilterSelect = ({ value, onChange, label = "Store" }) => {
  const authUser = useSelector((state) => state.auth.user);
  const isSuperAdmin = String(authUser?.role || "").toLowerCase() === "super_admin";
  const [stores, setStores] = useState(cachedStores || []);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let active = true;
    loadStores().then((rows) => {
      if (active) setStores(rows);
    });
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <Box>
      <Typography component="label" sx={{ display: "block", fontSize: 11, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
        {label}
      </Typography>
      <TextField
        select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
        sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
      >
        <MenuItem value="">All Stores (Consolidated)</MenuItem>
        {stores.map((store) => (
          <MenuItem key={store.id} value={String(store.id)}>
            {store.name || store.code || `Store ${store.id}`}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
};

export default StoreFilterSelect;
