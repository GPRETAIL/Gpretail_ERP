import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import api from '../api/axios';

export default function StoreActivation() {
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [code, setCode] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    const response = await api.get('/company-stores');
    setStores(response.data?.data || []);
    setWarehouses(response.data?.warehouses || []);
  };
  useEffect(() => { load().catch(e => setError(e.response?.data?.message || 'Could not load stores.')); }, []);
  const run = async (activate) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await api.post(activate ? '/company-stores/activate' : '/company-stores/sync', activate ? { store_code: storeCode.trim(), activation_code: code.trim() } : {});
      await load();
      if (activate) setCode('');
      setMessage(response.data?.message || 'Stores refreshed.');
    } catch (e) { setError(e.response?.data?.message || 'Could not reach GP Admin.'); }
    finally { setBusy(false); }
  };
  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Stack spacing={2}>
      <Typography variant="h4">Store Activation</Typography>
      <Typography>Use the store code and one-use activation code from the welcome email. Each store has its own subscription deadline.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Stack component="form" spacing={2} onSubmit={e => { e.preventDefault(); run(true); }}>
        <TextField label="Store code" value={storeCode} onChange={e => setStoreCode(e.target.value)} required />
        <TextField label="Activation code" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} required />
        <Button type="submit" variant="contained" disabled={busy}>Activate store</Button>
      </Stack>
      <Button onClick={() => run(false)} disabled={busy}>Refresh from GP Admin</Button>
      {!stores.length && <Alert severity="info">No stores have been provisioned. Ask GP Admin to create one, then refresh.</Alert>}
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
