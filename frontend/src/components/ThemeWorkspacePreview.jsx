import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider, Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import PageHeader from "./PageHeader";
import SearchGridPanel from "./SearchGridPanel";
import TablePaginationFooter from "./TablePaginationFooter";
import { createTenantTheme, getFontOption } from "../theme/themeRegistry";
import surfaceCss from "../theme/themeStyles.css?inline";
import baseCss from "../index.css?inline";

// Draft styling is confined to a separate document, including portals and Emotion CSS.
// No application store, APIs, preferences, or real business records are mounted here.
export default function ThemeWorkspacePreview({ brand, mode }) {
  const frameRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const cache = useMemo(() => document ? createCache({ key: "theme-preview", container: document.head }) : null, [document]);
  const theme = useMemo(() => createTheme(createTenantTheme(brand, mode), { components: Object.fromEntries(
    ["MuiPopover", "MuiMenu", "MuiPopper", "MuiModal"].map(name => [name, { defaultProps: { container: () => document?.body } }])
  ) }), [brand, mode, document]);
  useEffect(() => {
    const previewDoc = frameRef.current?.contentDocument;
    if (!previewDoc) return;
    previewDoc.documentElement.dataset.themeStyle = brand.theme_style || "classic";
    previewDoc.documentElement.classList.toggle("dark", mode === "dark");
    previewDoc.documentElement.style.fontFamily = getFontOption(brand.font_family).stack;
    previewDoc.body.style.margin = "0";
    previewDoc.body.style.fontSize = "13px";
    previewDoc.body.style.backgroundColor = theme.palette.background.default;
    const style = previewDoc.createElement("style");
    style.textContent = `${baseCss}\n${surfaceCss}`;
    previewDoc.head.appendChild(style);
    const font = getFontOption(brand.font_family);
    const link = previewDoc.createElement("link");
    if (font.google) {
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
      previewDoc.head.appendChild(link);
    }
    return () => { style.remove(); link.remove(); };
  }, [document, brand.theme_style, brand.font_family, mode, theme]);

  return <Box sx={{ height: "100%", minHeight: 620 }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Workspace Preview · {mode === "dark" ? "Dark" : "Light"}</Typography>
    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>Sample data only. Use the existing top-header toggle to check the other mode.</Typography>
    <Box ref={frameRef} component="iframe" title="Isolated ERP theme preview" sandbox="allow-same-origin" srcDoc="<!doctype html><html><head></head><body><main id='preview'></main></body></html>"
      onLoad={event => setDocument(event.currentTarget.contentDocument)} sx={{ width: "100%", height: "calc(100% - 64px)", minHeight: 560, border: 1, borderColor: "divider", borderRadius: 1 }} />
    {document && cache && createPortal(<CacheProvider value={cache}><ThemeProvider theme={theme}>
      <Box className="erp-app-shell" sx={{ bgcolor: "background.default", color: "text.primary", minHeight: "100vh" }}>
        <Stack direction="row" spacing={2} className="erp-glass-chrome" sx={{ p: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontWeight: 700 }}>Vynerix</Typography><Typography>Dashboard</Typography><Typography color="primary">Masters</Typography>
        </Stack>
        <PageHeader title="Master / Products" onBack={() => {}} actions={<Button onClick={() => setDialogOpen(true)}>New</Button>} />
        <Box sx={{ p: 1 }}><SearchGridPanel sx={{ height: "auto" }}>
          <Typography component="h2">Product Search</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}><TextField select defaultValue="all" size="small" aria-label="Preview search field" sx={{ width: 140 }}><MenuItem value="all">All Fields</MenuItem><MenuItem value="name">Name</MenuItem></TextField><TextField size="small" placeholder="Search products" sx={{ flex: 1 }} /><Button variant="contained" onClick={() => setNotice(true)}>Search</Button></Stack>
          <Box sx={{ maxHeight: 220, overflow: "auto", bgcolor: "background.paper" }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell>Product</TableCell><TableCell align="right">Stock</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{[["Cotton Shirt", 120, "Available"], ["Coffee Beans", 8, "Low stock"], ["Office Bag", 0, "Out of stock"]].map(([name, qty, label]) => <TableRow key={name}><TableCell>{name}</TableCell><TableCell align="right">{qty}</TableCell><TableCell><Chip size="small" label={label} color={qty === 0 ? "error" : qty < 10 ? "warning" : "success"} /></TableCell></TableRow>)}</TableBody></Table></Box>
          <TablePaginationFooter limit={20} page={1} totalPages={1} totalLabel="Total: 3" pageOptions={[1]} canJump={false} hasPrev={false} hasNext={false} onLimitChange={() => {}} />
        </SearchGridPanel></Box>
        {notice && <Box role="status" sx={{ m: 1, p: 1.5, bgcolor: "background.paper", border: 1, borderColor: "success.main", display: "flex", justifyContent: "space-between" }}>Preview search complete<Button size="small" onClick={() => setNotice(false)}>Close</Button></Box>}
        <Dialog open={dialogOpen} container={document.body} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth><DialogTitle>New Product · Preview</DialogTitle><DialogContent><TextField label="Product name" size="small" fullWidth sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => { setDialogOpen(false); setNotice(true); }}>Save Sample</Button></DialogActions></Dialog>
      </Box>
    </ThemeProvider></CacheProvider>, document.getElementById("preview"))}
  </Box>;
}
