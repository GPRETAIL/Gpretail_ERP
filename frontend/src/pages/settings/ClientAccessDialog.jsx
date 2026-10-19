import { useCallback, useState } from "react";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import api from "../../api/axios";
import useAsyncQuery from "../../hooks/useAsyncQuery";

export default function ClientAccessDialog({ user, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fetchAccess = useCallback(async ({ signal }) => (await api.get(`/user-access/${user.id}/client-access`, { signal })).data.data, [user.id]);
  const receive = useCallback(data => {
    const defaults = Object.fromEntries(Object.keys(data.store.sections).map(module => [module, { view: data.store.action_limits[module]?.view === true }]));
    setForm({ web_access: data.user.web_access, mobile_access: data.user.mobile_access, module_permissions: data.user.module_permissions || defaults });
  }, []);
  const { data, loading, error: loadError } = useAsyncQuery(fetchAccess, { onSuccess: receive });
  const toggle = (module, action, checked) => setForm(previous => {
    const grants = { ...previous.module_permissions[module], [action]: checked };
    if (checked) grants.view = true;
    if (action === "view" && !checked) for (const key of data.actions) grants[key] = false;
    return { ...previous, module_permissions: { ...previous.module_permissions, [module]: grants } };
  });
  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.put(`/user-access/${user.id}/client-access`, form);
      onSaved(); onClose();
    } catch (failure) { setError(failure.response?.data?.message || "Could not save user access."); }
    finally { setSaving(false); }
  };
  return <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
    <DialogTitle>Web, mobile and module access · {user.name || user.email}</DialogTitle>
    <DialogContent dividers>
      {(error || loadError) && <Alert severity="error">{error || "Unable to load access settings."}</Alert>}
      {loading && <Typography>Loading access…</Typography>}
      {data && form && <Stack spacing={2}>
        <Alert severity="info">Store: {data.store.name}. Mobile subscription: {data.store.mobile_entitled ? "Included" : "Unavailable"}. User grants are limited by this store's subscription. Saving replaces role defaults and signs this user out of existing sessions.</Alert>
        <Stack direction="row">
          <FormControlLabel label="Web access" control={<Checkbox checked={form.web_access} onChange={event => setForm(previous => ({ ...previous, web_access: event.target.checked }))} />} />
          <FormControlLabel label="Mobile access" control={<Checkbox disabled={!data.store.mobile_entitled && !form.mobile_access} checked={form.mobile_access} onChange={event => setForm(previous => ({ ...previous, mobile_access: event.target.checked }))} />} />
        </Stack>
        <Button onClick={() => setForm(previous => ({ ...previous, module_permissions: {} }))}>Clear module access</Button>
        <Table size="small"><TableHead><TableRow><TableCell>Module</TableCell>{data.actions.map(action => <TableCell key={action}>{action}</TableCell>)}</TableRow></TableHead>
          <TableBody>{data.modules.map(module => <TableRow key={module}><TableCell>{module}</TableCell>{data.actions.map(action => <TableCell key={action}><Checkbox size="small" disabled={!data.store.action_limits[module]?.[action] && !form.module_permissions[module]?.[action]} checked={form.module_permissions[module]?.[action] === true} onChange={event => toggle(module, action, event.target.checked)} slotProps={{ input: { "aria-label": `${module} ${action}` } }} /></TableCell>)}</TableRow>)}</TableBody>
        </Table>
      </Stack>}
    </DialogContent>
    <DialogActions><Button disabled={saving} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!form || loading || saving || Boolean(loadError)} onClick={save}>{saving ? "Saving…" : "Save access"}</Button></DialogActions>
  </Dialog>;
}
