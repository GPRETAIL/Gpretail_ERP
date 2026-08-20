import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import CloudQueueOutlined from "@mui/icons-material/CloudQueueOutlined";
import DnsOutlined from "@mui/icons-material/DnsOutlined";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { StatCard, StatusChip } from "./AdminUI";

// Dashboard-first overview shown at the top of the company-scoped management pages (Store, Warehouse,
// Subscriptions, Cloud Settings) and reused for Store Monitoring. It fetches the single aggregate
// GET /admin/monitoring/companies (totals + every company with its stores) and renders variant-specific
// totals + a company → store rollup. Picking a company calls onSelectCompany so the host page drills in.

const connectionTone = { online: "success", offline: "error", unconfigured: "slate" };
const connectionLabel = { online: "Online", offline: "Offline", unconfigured: "Not configured" };

// Per-variant totals tiles and the extra company column. Everything reads from the same payload.
const VARIANTS = {
  stores: {
    totals: (t) => [
      { label: "Companies", value: t.companies, tone: "primary" },
      { label: "Total Stores", value: t.stores, tone: "success" },
      { label: "Cloud Stores", value: t.cloud_stores, tone: "violet" },
      { label: "On-Premise Stores", value: t.on_prem_stores, tone: "warning" },
    ],
    col: { head: "Stores", value: (c) => `${c.stores_count} / ${c.max_stores || "∞"}` },
  },
  warehouses: {
    totals: (t) => [
      { label: "Companies", value: t.companies, tone: "primary" },
      { label: "Total Warehouses", value: t.warehouses, tone: "success" },
      { label: "Total Stores", value: t.stores, tone: "violet" },
      { label: "Active Companies", value: t.active_companies, tone: "warning" },
    ],
    col: { head: "Warehouses", value: (c) => `${c.warehouses_count ?? 0} / ${c.max_warehouses || "∞"}` },
  },
  subscriptions: {
    totals: (t) => [
      { label: "Companies", value: t.companies, tone: "primary" },
      { label: "Total Stores", value: t.stores, tone: "success" },
      { label: "Cloud Stores", value: t.cloud_stores, tone: "violet" },
      { label: "On-Premise Stores", value: t.on_prem_stores, tone: "warning" },
    ],
    col: { head: "Stores", value: (c) => `${c.stores_count}` },
  },
  cloud: {
    totals: (t) => [
      { label: "Companies", value: t.companies, tone: "primary" },
      { label: "Cloud Stores", value: t.cloud_stores, tone: "success" },
      { label: "On-Premise Stores", value: t.on_prem_stores, tone: "warning" },
      { label: "Online", value: t.online_stores, tone: "violet" },
    ],
    col: { head: "Hosting", value: (c) => `${c.stores_count} stores` },
  },
};

const CompanyStoreOverview = ({ variant = "stores", onSelectCompany, actionLabel = "Manage" }) => {
  const cfg = VARIANTS[variant] || VARIANTS.stores;
  const [data, setData] = useState({ totals: {}, companies: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/monitoring/companies");
        const payload = res.data?.data || { totals: {}, companies: [] };
        if (alive) setData({ totals: payload.totals || {}, companies: Array.isArray(payload.companies) ? payload.companies : [] });
      } catch (err) {
        if (alive) toast.error(err.response?.data?.message || "Failed to load overview");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const companies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.companies;
    return data.companies.filter((c) => [c.name, c.email, c.company_code].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [data.companies, search]);

  const headCell = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "text.secondary", bgcolor: "#f8fafc" };
  const totals = cfg.totals(data.totals || {});
  const showAction = typeof onSelectCompany === "function";
  const colSpan = showAction ? 6 : 5;

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {totals.map((t) => (
          <StatCard key={t.label} label={t.label} value={loading ? "…" : t.value ?? 0} tone={t.tone} />
        ))}
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>All Companies</Typography>
          <Typography sx={{ fontSize: 12, color: "text.disabled" }}>Overall view — pick a company below or from the dropdown above to drill in.</Typography>
          <TextField
            size="small"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ml: "auto", minWidth: 220 }}
            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchOutlined sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>) } }}
          />
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCell, width: 40 }} />
                <TableCell sx={headCell}>Company</TableCell>
                <TableCell sx={headCell}>Code</TableCell>
                <TableCell sx={headCell}>{cfg.col.head}</TableCell>
                <TableCell sx={headCell}>Status</TableCell>
                {showAction ? <TableCell sx={{ ...headCell, textAlign: "right" }}>Action</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={colSpan} sx={{ py: 5, textAlign: "center", color: "text.disabled" }}>Loading…</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={colSpan} sx={{ py: 5, textAlign: "center", color: "text.disabled" }}>{search ? "No companies match your search." : "No companies yet."}</TableCell></TableRow>
              ) : (
                companies.map((c) => {
                  const open = expanded === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow hover sx={{ cursor: "pointer" }}>
                        <TableCell>
                          <IconButton size="small" onClick={() => setExpanded(open ? null : c.id)}>
                            {open ? <ExpandMoreOutlined fontSize="small" /> : <ChevronRightOutlined fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} onClick={() => setExpanded(open ? null : c.id)}>
                          {c.name || c.email}
                          <Typography sx={{ fontSize: 12, color: "text.disabled" }}>{c.email}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{c.company_code || "—"}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{cfg.col.value(c)}</TableCell>
                        <TableCell><StatusChip label={c.status === "active" ? "Active" : "Inactive"} tone={c.status === "active" ? "success" : "error"} /></TableCell>
                        {showAction ? (
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => onSelectCompany(c.id)}>{actionLabel}</Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={colSpan} sx={{ bgcolor: "#f8fafc", py: 1.5 }}>
                            {(c.stores || []).length === 0 ? (
                              <Typography sx={{ fontSize: 13, color: "text.disabled", px: 1 }}>No stores under this company yet.</Typography>
                            ) : (
                              <Table size="small" sx={{ bgcolor: "#fff", borderRadius: 2 }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={headCell}>Store</TableCell>
                                    <TableCell sx={headCell}>Hosting</TableCell>
                                    <TableCell sx={headCell}>Connection</TableCell>
                                    <TableCell sx={headCell}>Modules</TableCell>
                                    <TableCell sx={headCell}>Last Sync</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(c.stores || []).map((s) => {
                                    const onPrem = s.deployment_type === "on_prem";
                                    return (
                                      <TableRow key={s.id}>
                                        <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                                        <TableCell>
                                          <StatusChip
                                            label={onPrem ? "On-Premise" : "Cloud"}
                                            tone={onPrem ? "warning" : "primary"}
                                            icon={onPrem ? <DnsOutlined sx={{ fontSize: 14 }} /> : <CloudQueueOutlined sx={{ fontSize: 14 }} />}
                                          />
                                        </TableCell>
                                        <TableCell><StatusChip label={connectionLabel[s.connection_status] || "—"} tone={connectionTone[s.connection_status] || "slate"} /></TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>{s.module_count} sections</TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>{s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "Never"}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default CompanyStoreOverview;
