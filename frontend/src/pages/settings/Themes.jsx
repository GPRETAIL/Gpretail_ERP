import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Alert, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import useAsyncQuery from "../../hooks/useAsyncQuery";
import PageHeader from "../../components/PageHeader";
import ThemeWorkspacePreview from "../../components/ThemeWorkspacePreview";
import { useTheme } from "../../features/theme-context";
import { loginSuccess } from "../../features/authSlice";
import { FONT_OPTIONS, isHexColor } from "../../theme/themeRegistry";
import { COLOR_FIELDS, STYLE_OPTIONS, normalizeTheme, themeErrors, themePayload } from "../../theme/themeWorkspace";
import { isTenantAdmin } from "../../utils/accessControl";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

function ThemeEditor({ snapshot, prefix, companyScope, mode, reload, token, onBusy, onDirty }) {
  const dispatch = useDispatch();
  const meta = snapshot.meta;
  const scopedApi = useMemo(() => {
    const config = { storeScopeId: prefix.startsWith("/companies/") ? prefix.split("/")[2] : undefined };
    return { get: (url, options) => api.get(url, { ...options, ...config }),
      put: (url, body) => api.put(url, body, config), post: (url, body) => api.post(url, body, config), delete: url => api.delete(url, config) };
  }, [prefix]);
  const [draft, setDraft] = useState(() => normalizeTheme(meta.effective || snapshot.data));
  const [allowedStores, setAllowedStores] = useState(meta.allowed_store_ids || []);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(null);
  const [presetDialog, setPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [olderHistory, setOlderHistory] = useState([]);
  const [olderCursor, setOlderCursor] = useState(undefined);
  const original = useMemo(() => normalizeTheme(meta.effective || snapshot.data), [meta.effective, snapshot.data]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original) || JSON.stringify(allowedStores) !== JSON.stringify(meta.allowed_store_ids || []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const errors = useMemo(() => themeErrors(draft), [draft]);
  const editable = companyScope || meta.override_allowed;
  const fetchLibrary = useCallback(async ({ signal }) => {
    const results = await Promise.allSettled([scopedApi.get(`${prefix}/theme-presets`, { signal }), scopedApi.get(`${prefix}/theme-history`, { signal })]);
    return { presets: results[0].status === "fulfilled" ? results[0].value.data.data : [], history: results[1].status === "fulfilled" ? results[1].value.data.data : [], nextBefore: results[1].status === "fulfilled" ? results[1].value.data.meta?.next_before : null, failed: results.some(result => result.status === "rejected") };
  }, [prefix, scopedApi]);
  const { data: library, loading: libraryLoading, reload: reloadLibrary } = useAsyncQuery(fetchLibrary);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const run = async (operation, success, refresh = false) => {
    setBusy(true); onBusy(true);
    try {
      await operation();
      toast.success(success);
      if (refresh) {
        reload({ silent: true });
        try {
          const response = await api.get("/auth/me");
          if (response.data?.data) dispatch(loginSuccess({ token, user: response.data.data }));
        } catch { toast.warn("Theme saved. Workspace refresh failed; your previous appearance remains until you reload."); }
      }
      setOlderHistory([]); setOlderCursor(undefined);
      reloadLibrary();
      setPublish(null); setPresetDialog(false);
    } catch (error) {
      toast.error(error.response?.status === 409 ? "Another administrator changed this theme. Reload the saved theme before applying again." : apiErrorMessage(error, "Unable to update theme"));
    } finally { setBusy(false); onBusy(false); }
  };
  const loadOlder = async () => {
    setBusy(true); onBusy(true);
    try {
    const response = await scopedApi.get(`${prefix}/theme-history`, { params: { before_revision: olderCursor === undefined ? library.nextBefore : olderCursor } });
    setOlderHistory(previous => [...previous, ...(response.data.data || [])]);
    setOlderCursor(response.data.meta?.next_before ?? null);
    } catch (error) { toast.error(apiErrorMessage(error, "Unable to load earlier revisions")); }
    finally { setBusy(false); onBusy(false); }
  };
  const save = () => run(() => scopedApi.put(`${prefix}/theme`, {
    ...(publish === "inherit" ? {} : themePayload(draft)), expected_revision: meta.revision,
    ...(companyScope ? { allowed_store_ids: allowedStores } : {}),
  }), publish === "inherit" ? "Company theme restored" : "Theme applied", true);
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  const affectedStores = (meta.stores || []).map(store => store.name);

  return <>
    <PageHeader title="Settings / Themes" actions={<>
      <Button disabled={!dirty || busy} onClick={() => { setDraft(original); setAllowedStores(meta.allowed_store_ids || []); }}>Discard</Button>
      <Button disabled={busy || !editable || errors.length > 0} onClick={() => { setPresetName(""); setPresetDialog(true); }}>Save Preset</Button>
      <Button variant="contained" disabled={busy || !editable || errors.length > 0} onClick={() => setPublish("apply")}>{busy ? "Applying…" : "Apply Theme"}</Button>
    </>} />
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.5 }}>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {companyScope ? "Editing the company default. Stores without permitted overrides inherit this theme." : meta.source === "store" ? "Store Override — this store uses its own appearance." : "Inherited from Company — applying a theme creates a store override."}
        {" "}Light/Dark is controlled by the existing top-header toggle. Shared control and grid sizes stay unchanged.
      </Alert>
      {!editable && <Alert severity="warning" sx={{ mb: 1 }}>This store is locked to company branding. Tenant Admin must enable its override in Company Default before it can be customized.</Alert>}
      {dirty && <Alert severity="warning" sx={{ mb: 1 }}>You have unsaved branding changes.</Alert>}
      {errors.length > 0 && <Alert severity="error" sx={{ mb: 1 }}>{errors.map(error => <Box key={error}>{error}</Box>)}</Alert>}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(0, 1fr) minmax(420px, 1fr)" } }}>
        <Card variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
          <Tabs value={section} onChange={(_, value) => setSection(value)} variant="scrollable" scrollButtons="auto" aria-label="Theme settings sections">
            {["Styles", "Brand Colors", "Typography", "Store Overrides", "Presets & History"].map(label => <Tab key={label} label={label} />)}
          </Tabs>
          <Stack spacing={2} sx={{ pt: 2 }}>
            {section === 0 && <>
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>Professional Styles</Typography>
              {[...STYLE_OPTIONS, ...(draft.theme_style === "apple" || original.theme_style === "apple" ? [["apple", "Apple (saved)", "Your existing Apple configuration is preserved."]] : [])].map(([id, label, description]) => <Button key={id} disabled={!editable || busy} aria-pressed={draft.theme_style === id} variant={draft.theme_style === id ? "outlined" : "text"} onClick={() => change("theme_style", id)} sx={{ justifyContent: "flex-start", textAlign: "left", p: 1.5 }}><Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{description}</Typography></Box></Button>)}
              <Button disabled={!editable || busy} onClick={() => setDraft(normalizeTheme({}))}>Reset Draft to Vynerix Default</Button>
              <TextField label="Corner radius value" type="number" size="small" value={draft.border_radius} disabled={!editable || busy} onChange={event => change("border_radius", event.target.value === "" ? "" : Number(event.target.value))} slotProps={{ htmlInput: { min: 0, max: 32 } }} helperText="Decorative surfaces only. Shared inputs, buttons and grid dimensions stay consistent." />
            </>}
            {section === 1 && <>
              {[ ["primary_color", "Primary"], ["secondary_color", "Secondary"] ].map(([key, label]) => <Stack key={key} direction="row" spacing={1} sx={{ alignItems: "center" }}><Box component="input" type="color" aria-label={`${label} color picker`} value={isHexColor(draft[key]) ? (draft[key].length === 4 ? "#" + [...draft[key].slice(1)].map(part => part + part).join("") : draft[key]) : "#3a6ea5"} disabled={!editable || busy} onChange={event => change(key, event.target.value)} sx={{ width: 36, height: 28, cursor: "pointer" }} /><TextField label={`${label} color hex`} value={draft[key]} disabled={!editable || busy} size="small" onChange={event => change(key, event.target.value.trim())} sx={{ flex: 1 }} /></Stack>)}
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>{mode === "dark" ? "Dark" : "Light"} Mode Colors</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Optional overrides for the current header-selected mode. Clear a value to use the default. Both modes are checked before applying.</Typography>
              {COLOR_FIELDS.map(([key, label]) => <TextField key={key} label={`${label} color hex`} size="small" value={draft[`${mode}_colors`][key] || ""} disabled={!editable || busy} onChange={event => change(`${mode}_colors`, { ...draft[`${mode}_colors`], [key]: event.target.value.trim() })} />)}
            </>}
            {section === 2 && <>
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>Typography</Typography>
              <Typography sx={{ fontSize: 12 }}>System Default works offline. Web fonts fall back to installed fonts when the internet is unavailable.</Typography>
              {FONT_OPTIONS.filter(font => font.id !== "playfair" || original.font_family === "playfair").map(font => <Button key={font.id} aria-pressed={draft.font_family === font.id} variant={draft.font_family === font.id ? "outlined" : "text"} disabled={!editable || busy} onClick={() => change("font_family", font.id)} sx={{ justifyContent: "flex-start" }}>{font.label}</Button>)}
            </>}
            {section === 3 && <>
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>Store Overrides</Typography>
              {companyScope ? <>
                <Typography sx={{ fontSize: 12 }}>Allow these stores to keep and edit their own theme. Unchecked stores inherit the company default; retained configurations are not deleted.</Typography>
                {(meta.stores || []).map(store => <FormControlLabel key={store.id} label={store.name} control={<Checkbox disabled={busy} checked={allowedStores.includes(store.id)} onChange={(_, checked) => setAllowedStores(previous => checked ? [...previous, store.id] : previous.filter(id => id !== store.id))} />} />)}
                {!meta.stores?.length && <Typography>No stores yet. New stores will inherit the company theme.</Typography>}
              </> : <Button disabled={busy || !editable || meta.source !== "store"} onClick={() => setPublish("inherit")}>Use Company Theme</Button>}
            </>}
            {section === 4 && <>
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>Saved Presets</Typography>
              {libraryLoading && <Typography>Loading presets…</Typography>}
              {library?.failed && <Alert severity="warning" action={<Button onClick={() => reloadLibrary()}>Retry</Button>}>Some presets or history could not be loaded.</Alert>}
              {!libraryLoading && !library?.presets?.length && <Typography>No saved presets yet.</Typography>}
              {(library?.presets || []).map(preset => <Stack direction="row" spacing={1} key={preset.id} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography sx={{ flex: 1 }}>{preset.name}</Typography><Button disabled={busy || !editable} onClick={() => { setDraft(normalizeTheme(preset.config)); setSection(0); }}>Preview Preset</Button><Button disabled={busy || !editable} onClick={() => { if (window.confirm(`Delete the preset “${preset.name}”?`)) run(() => scopedApi.delete(`${prefix}/theme-presets/${preset.id}`), "Preset deleted"); }}>Delete</Button></Stack>)}
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700 }}>Revision History</Typography>
              <Typography sx={{ fontSize: 12 }}>Restoring creates a new revision and validates the saved colors again.</Typography>
              {!libraryLoading && !library?.history?.length && <Typography>No revisions yet. Your current settings will be captured before the first change.</Typography>}
              {[...(library?.history || []), ...olderHistory].map(revision => <Stack key={revision.id} direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}><Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 12 }}>Revision {revision.revision} · {revision.operation}</Typography><Typography sx={{ fontSize: 11, color: "text.secondary" }}>{revision.author || "Deleted user"} · {revision.created_at} UTC</Typography></Box><Button disabled={busy || !editable || revision.revision === meta.revision} onClick={() => setPublish({ restore: revision })}>Restore</Button></Stack>)}
              {(olderCursor === undefined ? library?.nextBefore : olderCursor) && <Button disabled={busy} onClick={loadOlder}>Load Earlier Revisions</Button>}
            </>}
          </Stack>
        </Card>
        <ThemeWorkspacePreview brand={draft} mode={mode} />
      </Box>
    </Box>
    <Dialog open={publish !== null} onClose={() => { if (!busy) setPublish(null); }} maxWidth="sm" fullWidth>
      <DialogTitle>{publish?.restore ? "Restore theme revision" : publish === "inherit" ? "Use Company Theme" : "Apply Theme"}</DialogTitle>
      <DialogContent><Typography>This changes {companyScope ? "the company default" : "this store’s appearance"}. Print formats and business data are unaffected.</Typography>
        {companyScope && <><Typography sx={{ mt: 1, fontWeight: 600 }}>Company stores affected by this change:</Typography><Typography>{affectedStores.join(", ") || "No existing stores; new stores will inherit it."}</Typography><Typography sx={{ mt: 1 }}>Permitted store overrides retain their customized fields; other fields inherit the company default. Stores without permitted overrides inherit the entire company theme. Override permissions are saved with this revision.</Typography></>}
        {publish?.restore && <Alert severity="info" sx={{ mt: 1 }}>Restore revision {publish.restore.revision}, including its saved override policy. A new history entry will be created.</Alert>}
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setPublish(null)}>Cancel</Button><Button disabled={busy} variant="contained" onClick={() => publish?.restore ? run(() => scopedApi.post(`${prefix}/theme-history/${publish.restore.id}/restore`, { expected_revision: meta.revision }), "Theme revision restored", true) : save()}>{busy ? "Applying…" : "Confirm Apply"}</Button></DialogActions>
    </Dialog>
    <Dialog open={presetDialog} onClose={() => { if (!busy) setPresetDialog(false); }} maxWidth="xs" fullWidth><DialogTitle>Save Current Theme As…</DialogTitle><DialogContent><TextField label="Preset name" fullWidth value={presetName} onChange={event => setPresetName(event.target.value)} slotProps={{ htmlInput: { maxLength: 60 } }} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button disabled={busy} onClick={() => setPresetDialog(false)}>Cancel</Button><Button disabled={busy || !presetName.trim() || errors.length > 0} onClick={() => run(() => scopedApi.post(`${prefix}/theme-presets`, { name: presetName.trim(), ...themePayload(draft) }), "Preset saved")}>Save Preset</Button></DialogActions></Dialog>
  </>;
}

export default function Themes() {
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const { theme: mode } = useTheme();
  const companyAdmin = Boolean(user?.platform_company_code && (isTenantAdmin(user) || user?.role === "super_admin"));
  const [scope, setScope] = useState(companyAdmin ? "company" : "store");
  const [storeId, setStoreId] = useState(String(user?.company_id || ""));
  const [busy, setBusy] = useState(false);
  const prefix = scope === "company" ? "/tenant" : storeId ? `/companies/${storeId}` : null;
  const fetchSnapshot = useCallback(async ({ signal }) => (await api.get(`${prefix}/theme`, { signal, storeScopeId: prefix?.startsWith("/companies/") ? prefix.split("/")[2] : undefined })).data, [prefix]);
  const { data: snapshot, loading, error, reload } = useAsyncQuery(fetchSnapshot, { enabled: Boolean(prefix) });
  const fetchStores = useCallback(async ({ signal }) => (await api.get("/companies", { signal, params: { limit: 500 } })).data?.data || [], []);
  const { data: stores } = useAsyncQuery(fetchStores, { enabled: companyAdmin });
  const [editorDirtyKey, setEditorDirtyKey] = useState(null);
  const selectScope = (nextScope, nextStore = storeId) => {
    if (editorDirtyKey && !window.confirm("Discard unsaved theme changes and switch scope?")) return;
    setScope(nextScope); setStoreId(nextStore); setEditorDirtyKey(null);
  };
  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
    <Stack direction="row" spacing={1} sx={{ p: 1, alignItems: "center", flexWrap: "wrap", gap: 1 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Editing scope</Typography>
      {companyAdmin && <TextField select size="small" label="Theme scope" value={scope} disabled={busy} onChange={event => selectScope(event.target.value)} sx={{ minWidth: 170 }}><MenuItem value="company">Company Default</MenuItem><MenuItem value="store">Store Override</MenuItem></TextField>}
      {scope === "store" && companyAdmin && <TextField select size="small" label="Store" value={storeId} disabled={busy} onChange={event => selectScope("store", String(event.target.value))} sx={{ minWidth: 180 }}><MenuItem value="">Select store</MenuItem>{(stores || []).map(store => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</TextField>}
      <Chip size="small" label={scope === "company" ? "Company Default" : "Store Override"} />
      <Button size="small" disabled={busy} onClick={() => { if (!editorDirtyKey || window.confirm("Discard your draft and reload the saved theme?")) reload(); }}>Reload saved theme</Button>
    </Stack>
    {!prefix && <Alert severity="info">Select a store to manage its theme. A linked Tenant Administrator can set a company default before stores are created.</Alert>}
    {loading && <Typography sx={{ p: 2 }}>Loading saved theme…</Typography>}
    {error && <Alert severity="error" action={<Button onClick={() => reload({ silent: true })}>Retry</Button>}>{apiErrorMessage(error, "Unable to load the saved theme. Your active appearance has not changed.")}</Alert>}
    {snapshot?.meta && <ThemeEditor key={`${prefix}:${snapshot.meta.revision}:${JSON.stringify(snapshot.data)}`} snapshot={snapshot} prefix={prefix} companyScope={scope === "company"} mode={mode} reload={reload} token={token} onBusy={setBusy} onDirty={setEditorDirtyKey} />}
  </Box>;
}
