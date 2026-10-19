import useAsyncQuery from "../hooks/useAsyncQuery";
import React, { useCallback, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import checkAuth from '../utils/checkAuth';
import api from '../api/axios';

export default function StoreActivation() {
  const dispatch = useDispatch();
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [code, setCode] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fetchStores = useCallback(async ({ signal } = {}) => {
    const response = await api.get('/company-stores', { signal });
    return response.data;
  }, []);
  const applyStores = useCallback((data) => {
    const response = { data };
    setStores(response.data?.data || []);
    setWarehouses(response.data?.warehouses || []);
  }, []);
  useAsyncQuery(fetchStores, { onSuccess: applyStores, onError: e => setError(e.response?.data?.message || 'Could not load stores.') });
  const load = async () => applyStores(await fetchStores());
  const run = async (activate) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await api.post(activate ? '/company-stores/activate' : '/company-stores/sync', activate ? { store_code: storeCode.trim(), activation_code: code.trim() } : {});
      await load();
      await checkAuth(dispatch);
      if (activate) setCode('');
      setMessage(response.data?.message || 'Stores refreshed.');
    } catch (e) { setError(e.response?.data?.message || 'Could not reach Vynerix Admin.'); }
    finally { setBusy(false); }
  };
  const handleCodeChange = (e) => {
    const val = e.target.value;
    setCode(val);
    const clean = val.trim();
    if (clean.toUpperCase().startsWith('GPR-')) {
      try {
        const raw = clean.substring(4).replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(raw));
        if (decoded.s) setStoreCode(decoded.s);
        if (decoded.o) setCode(decoded.o);
      } catch {
        // fallback to literal value
      }
    }
  };

  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Stack spacing={2}>
      <Typography variant="h4">Store Activation</Typography>
      <Typography>Use the Store License Key or the store code and activation code from the welcome email.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Stack component="form" spacing={2} onSubmit={e => { e.preventDefault(); run(true); }}>
        <TextField label="Store code" value={storeCode} onChange={e => setStoreCode(e.target.value)} required />
        <TextField label="Activation code or License Key" type="text" autoComplete="off" placeholder="Paste single GPR- license key or enter code" value={code} onChange={handleCodeChange} required />
        <Button type="submit" variant="contained" disabled={busy}>Activate store</Button>
      </Stack>
      <Button onClick={() => run(false)} disabled={busy}>Refresh from Vynerix Admin</Button>
      {!stores.length && <Alert severity="info">No stores have been provisioned. Ask Vynerix Admin to create one, then refresh.</Alert>}
      {stores.map(store => <Paper key={store.id} variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600}>{store.name} · {store.code}</Typography>
        <Typography>{store.activated_at ? (!store.is_active ? 'Inactive' : (store.platform_active_till && new Date(store.platform_active_till) <= new Date() ? 'Subscription expired' : 'Activated')) : 'Pending activation'}</Typography>
        <Typography>Plan: {store.platform_subscription?.plan_name || 'Trial'} · Expires: {store.platform_active_till ? new Date(store.platform_active_till).toLocaleDateString() : 'Starts on activation'}</Typography>
        {!store.activated_at && <Button onClick={() => setStoreCode(store.code)}>Activate this store</Button>}
      </Paper>)}
      <Box><Button href="/dashboard">Return to ERP</Button></Box>
      {warehouses.length > 0 && <Typography variant="h6">Warehouses</Typography>}
      {warehouses.map(warehouse => <Paper key={warehouse.id} variant="outlined" sx={{ p: 2 }}>
        <Typography>{warehouse.name} · {warehouse.code}</Typography>
        <Typography>{warehouse.is_active ? 'Available' : 'Waiting for an active parent store'} · Store: {stores.find(store => store.id === warehouse.store_id)?.name}</Typography>
      </Paper>)}
    </Stack>
  </Container>;
}
