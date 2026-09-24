import React, { useEffect, useState } from "react";
import { LogOut, PlusCircle, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api/axios";
import { muiFieldSx } from "../../theme/formControlSizes";

const REQUIRED_FIELDS = ["code", "name", "regName", "contactPerson", "contactNo"];

const PRINTER_TYPE_OPTIONS = [
  { value: "printer_only", label: "Printer Only" },
  { value: "offline_only", label: "Offline Only" },
  { value: "both", label: "Both" },
];

const emptyForm = {
  code: "",
  name: "",
  regName: "",
  contactPerson: "",
  contactNo: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  accessLevel: "full",
  accessModules: [],
  address: "",
  cityId: "",
  pinCode: "",
  stateId: "",
  countryId: "",
  internalVendorMargin: "",
  asSupplier: false,
  asCustomer: false,
  gstNo: "",
  gstUsername: "",
  einvoiceUsername: "",
  einvoicePassword: "",
  gstAccessKey: "",
  pfEsiNo: "",
  tanPan: "",
  bankAccountName: "",
  accountNo: "",
  ifsc: "",
  emailId: "",
  website: "",
  logo: "",
  active: true,
  vxAdminManaged: false,
};

const emptyPrinterRow = {
  location: "",
  server: "",
  ip: "",
  port: "",
  type: "printer_only",
};

// Module sections a store can be entitled to (matches the page catalog slugs).
// Core = Sales + Warehouse + Masters (Dashboard is always on); excludes
// Store, Finance, Analytical, CRM, Settings.
const MODULE_SECTIONS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "sales", label: "Sales / POS" },
  { slug: "warehouse", label: "Warehouse / Purchase" },
  { slug: "masters", label: "Masters" },
  { slug: "store", label: "Store" },
  { slug: "crm", label: "CRM" },
  { slug: "finance", label: "Finance" },
  { slug: "analytical", label: "Analytical" },
  { slug: "settings", label: "Settings" },
];
const CORE_SLUGS = ["sales", "warehouse", "masters"];

const resolveAssetUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  if (/^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, "")}${path}`;
  }
  return path;
};

const InputField = ({ label, required = false, children, sx }) => (
  <Box sx={sx}>
    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
      {required && <Box component="span" sx={{ mr: 0.5, color: "error.main" }}>*</Box>}
      {label}
    </Typography>
    {children}
  </Box>
);

const CompanySettings = () => {
  const [form, setForm] = useState(emptyForm);
  const [currentId, setCurrentId] = useState(null);

  const [cityOptions, setCityOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

  const [printerRow, setPrinterRow] = useState(emptyPrinterRow);
  const [printerConfigurations, setPrinterConfigurations] = useState([]);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [overview, setOverview] = useState({ stores: [], warehouses: [] });

  const mapApiToForm = (record) => ({
    code: record.code || "",
    name: record.name || "",
    regName: record.reg_name || "",
    contactPerson: record.contact_person || "",
    contactNo: record.contact_no || "",
    adminName: record.admin_user?.name || "",
    adminEmail: record.admin_user?.email || record.email_id || record.email || "",
    adminPassword: "",
    address: record.address || "",
    cityId: record.city_id ? String(record.city_id) : "",
    pinCode: record.pin_code || record.pincode || "",
    stateId: record.state_id ? String(record.state_id) : "",
    countryId: record.country_id ? String(record.country_id) : "",
    internalVendorMargin:
      record.internal_vendor_margin !== null && record.internal_vendor_margin !== undefined
        ? String(record.internal_vendor_margin)
        : "",
    asSupplier: !!record.as_supplier,
    asCustomer: !!record.as_customer,
    gstNo: record.gst_no || record.gstin || "",
    gstUsername: record.gst_username || "",
    einvoiceUsername: record.einvoice_username || "",
    einvoicePassword: record.einvoice_password || "",
    gstAccessKey: record.gst_access_key || "",
    pfEsiNo: record.pf_esi_no || "",
    tanPan: record.tan_pan || record.pan || "",
    bankAccountName: record.bank_account_name || "",
    accountNo: record.account_no || "",
    ifsc: record.ifsc || "",
    emailId: record.email_id || record.email || "",
    website: record.website || "",
    logo: record.logo || "",
    active: record.is_active !== undefined ? !!record.is_active : true,
    vxAdminManaged: !!record.vx_admin_managed,
  });

  const loadCompanyById = async (id) => {
    if (!id) return;
    const res = await api.get(`/companies/${id}`);
    const record = res.data?.data;
    if (!record) return;

    setCurrentId(record.id);
    setForm(mapApiToForm(record));
    setPrinterConfigurations(Array.isArray(record.printer_configurations) ? record.printer_configurations : []);
    setLogoFile(null);
    setLogoPreview(resolveAssetUrl(record.logo));
  };

  const loadSearchResults = async (query = "") => {
    try {
      setSearchLoading(true);
      // Active only. Stores here mirror what VX-Admin says exists; one it removed is deactivated
      // locally and cannot be edited or re-activated from the tenant anyway (the next sync would
      // just flip it back), so listing it only invites confusion.
      const res = await api.get("/companies", {
        params: {
          limit: 200,
          search: query || undefined,
        },
      });
      setSearchResults(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load companies");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [citiesRes, statesRes, countriesRes] = await Promise.all([
          api.get("/configurations/city"),
          api.get("/configurations/state"),
          api.get("/configurations/country"),
        ]);

        if (!mounted) return;

        setCityOptions((citiesRes.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })));
        setStateOptions((statesRes.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })));
        setCountryOptions((countriesRes.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })));
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load company setup");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    loadOverview();

    return () => {
      mounted = false;
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showSearchPage) return;

    const timer = setTimeout(() => {
      loadSearchResults(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearchPage, searchQuery]);

  const setField = (name) => (e) => {
    const { type, checked, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const setPrinterField = (name) => (e) => {
    setPrinterRow((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const handleAddPrinter = () => {
    const row = {
      location: printerRow.location.trim(),
      server: printerRow.server.trim(),
      ip: printerRow.ip.trim(),
      port: printerRow.port.trim(),
      type: printerRow.type,
    };

    if (!row.location || !row.server || !row.ip || !row.port || !row.type) {
      toast.warn("Please fill all printer fields before adding");
      return;
    }

    setPrinterConfigurations((prev) => [...prev, row]);
    setPrinterRow(emptyPrinterRow);
  };

  const removePrinter = (idx) => {
    setPrinterConfigurations((prev) => prev.filter((_, index) => index !== idx));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    setForm((prev) => ({ ...prev, logo: "" }));

    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
  };

  // Read-only rollup of the synced stores + warehouses (with store tagging) for this super-admin.
  const loadOverview = async () => {
    try {
      const res = await api.get("/companies/tenant-sync/overview");
      const data = res.data?.data || {};
      setOverview({
        stores: Array.isArray(data.stores) ? data.stores : [],
        warehouses: Array.isArray(data.warehouses) ? data.warehouses : [],
      });
    } catch {
      /* non-fatal — the panel just stays empty */
    }
  };

  // Manual "Sync now": pull the latest subscription/limits/login-password config from VX-Admin instead
  // of waiting for the background loop. Reloads the currently open store so any changes show immediately.
  const handleSyncFromAdmin = async () => {
    try {
      setSyncing(true);
      const res = await api.post("/companies/tenant-sync/pull");
      const data = res.data?.data || {};
      const applied = Number(data.applied || 0);
      toast.success(
        applied > 0
          ? `Synced from VX-Admin — ${applied} company update${applied === 1 ? "" : "s"} applied.`
          : "Synced from VX-Admin — already up to date."
      );
      if (currentId) {
        await loadCompanyById(currentId);
      }
      if (showSearchPage) {
        await loadSearchResults(searchQuery);
      }
      await loadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || "Sync from VX-Admin failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleNew = () => {
    setCurrentId(null);
    setForm(emptyForm);
    setPrinterConfigurations([]);
    setPrinterRow(emptyPrinterRow);
    setLogoFile(null);
    setLogoPreview("");
    setShowSearchPage(false);
  };

  const handleOpenSearch = () => {
    setShowSearchPage(true);
  };

  const handleSelectCompany = async (id) => {
    try {
      await loadCompanyById(id);
      setShowSearchPage(false);
      toast.success("Company loaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load company");
    }
  };

  const handleDeleteCompany = async (row) => {
    const companyName = row?.name || "this company";
    const confirmed = window.confirm(
      `Delete ${companyName}? This will permanently delete the company, its admin/users, and all company data.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/companies/${row.id}`);
      if (String(currentId || "") === String(row.id || "")) {
        handleNew();
      }
      await loadSearchResults(searchQuery);
      toast.success("Company deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete company");
    }
  };

  const handleForceLogout = async (row) => {
    try {
      await api.post(`/companies/${row.id}/force-logout`);
      toast.success("Company admin logged out");
      await loadSearchResults(searchQuery);
      if (String(currentId || "") === String(row.id || "")) {
        await loadCompanyById(row.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to logout company admin");
    }
  };

  const handleSave = async () => {
    for (const field of REQUIRED_FIELDS) {
      if (!String(form[field] || "").trim()) {
        toast.warn(`${field.replace(/[A-Z]/g, (m) => ` ${m}`).trim()} is required`);
        return;
      }
    }

    const payload = new FormData();
    payload.append("code", form.code);
    payload.append("name", form.name);
    payload.append("regName", form.regName);
    payload.append("contactPerson", form.contactPerson);
    payload.append("contactNo", form.contactNo);
    payload.append("adminName", form.adminName);
    payload.append("adminEmail", form.adminEmail);
    payload.append("adminPassword", form.adminPassword);
    // Per-store module entitlement chosen by the super admin.
    if (form.accessLevel) {
      payload.append("access_level", form.accessLevel);
      if (form.accessLevel === "custom") {
        payload.append("modules", (form.accessModules || []).join(","));
      }
    }

    payload.append("address", form.address);
    payload.append("cityId", form.cityId);
    payload.append("pinCode", form.pinCode);
    payload.append("stateId", form.stateId);
    payload.append("countryId", form.countryId);

    payload.append("internalVendorMargin", form.internalVendorMargin);
    payload.append("asSupplier", String(form.asSupplier));
    payload.append("asCustomer", String(form.asCustomer));

    payload.append("gstNo", form.gstNo);
    payload.append("gstUsername", form.gstUsername);
    payload.append("einvoiceUsername", form.einvoiceUsername);
    payload.append("einvoicePassword", form.einvoicePassword);
    payload.append("gstAccessKey", form.gstAccessKey);
    payload.append("pfEsiNo", form.pfEsiNo);
    payload.append("tanPan", form.tanPan);

    payload.append("bankAccountName", form.bankAccountName);
    payload.append("accountNo", form.accountNo);
    payload.append("ifsc", form.ifsc);
    payload.append("emailId", form.emailId);
    payload.append("website", form.website);
    payload.append("active", String(form.active));

    payload.append("printerConfigurations", JSON.stringify(printerConfigurations));

    if (logoFile) {
      payload.append("logo", logoFile);
    } else if (form.logo) {
      payload.append("logo", form.logo);
    }

    try {
      setSaving(true);
      const res = currentId
        ? await api.put(`/companies/${currentId}`, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await api.post("/companies", payload, {
            headers: { "Content-Type": "multipart/form-data" },
          });

      const saved = res.data?.data;
      if (saved?.id) {
        await loadCompanyById(saved.id);
      }

      toast.success(currentId ? "Company updated" : "Company created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save company");
    } finally {
      setSaving(false);
    }
  };

  const cardSx = { bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "5.25px", boxShadow: 1 };
  const fieldSx = muiFieldSx;

  if (loading) {
    return <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Loading company setup...</Typography>;
  }

  return (
    <Stack spacing={1.5} sx={{ pb: 10 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", ...cardSx, px: 1.5, py: 1 }}>
        <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>Settings / Company</Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 12.25 }}>
          <Button
            type="button"
            variant="text"
            color="inherit"
            onClick={handleSyncFromAdmin}
            disabled={syncing}
            title="Pull the latest subscription, limits and login password from VX-Admin"
            startIcon={<RefreshCw size={16} style={syncing ? { animation: "app-spin 1s linear infinite" } : undefined} />}
            sx={{ fontSize: 12.25, color: "text.secondary" }}
          >
            {syncing ? "Syncing…" : "Sync from VX-Admin"}
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={handleNew}
            startIcon={<PlusCircle size={16} />}
            sx={{ fontSize: 12.25 }}
          >
            New
          </Button>
          <Button
            type="button"
            className="glass-btn glass-btn-success"
            onClick={handleSave}
            disabled={saving || showSearchPage}
          >
            <Save size={16} style={{marginRight: 4}} />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            className="glass-btn glass-btn-primary"
            onClick={handleOpenSearch}
          >
            <Search size={16} style={{marginRight: 4}} />
            Search
          </Button>
        </Stack>
      </Stack>

      {(overview.stores.length > 0 || overview.warehouses.length > 0) && (
        <Box sx={{ ...cardSx, p: 1.5 }}>
          <Typography component="h2" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 1 }}>
            Stores &amp; Warehouses <Box component="span" sx={{ fontSize: 10.5, fontWeight: 400, color: "text.disabled" }}>(synced from VX-Admin)</Box>
          </Typography>
          {/* One table rather than two side-by-side lists: a warehouse is a location under the same
              company as the stores, so it belongs in the same list distinguished by Store Type.
              Split columns made them look like unrelated things and hid warehouses entirely from
              anyone scanning the stores column. */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 520, "& th, & td": { fontSize: 12.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ borderColor: "divider", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Name</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Store Type</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Tagged To</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ...overview.stores.map((s) => ({ ...s, __type: "Store" })),
                  ...overview.warehouses.map((w) => ({ ...w, __type: "Warehouse" })),
                ].map((row, i) => {
                  const tags = Array.isArray(row.store_tags)
                    ? row.store_tags.map((t) => t?.name).filter(Boolean)
                    : [];
                  const isWarehouse = row.__type === "Warehouse";
                  return (
                    <TableRow key={`${row.__type}-${row.code || i}`}>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>{row.name || row.code}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>
                        <Box
                          component="span"
                          sx={{
                            borderRadius: 1, px: 0.75, py: 0.25, fontSize: 11,
                            ...(isWarehouse
                              ? { color: "#6366f1", bgcolor: (theme) => alpha("#6366f1", theme.palette.mode === "dark" ? 0.2 : 0.1) }
                              : { color: "info.main", bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.2 : 0.1) }),
                          }}
                        >
                          {row.__type}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: "divider", fontSize: 10.5, color: "text.secondary" }}>
                        {isWarehouse
                          ? (tags.length > 0 ? tags.join(", ") : "Not tagged to any store")
                          : "—"}
                      </TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>
                        <Box
                          component="span"
                          sx={{
                            borderRadius: 1, px: 0.75, py: 0.25, fontSize: 11,
                            ...(row.status === "active"
                              ? { color: "success.main", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.2 : 0.1) }
                              : { color: "text.secondary", bgcolor: "action.hover" }),
                          }}
                        >
                          {row.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {showSearchPage ? (
        <Stack spacing={1.5} sx={{ ...cardSx, p: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField
              type="text"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name"
              sx={{ maxWidth: 420, ...fieldSx }}
            />
            <Button type="button" variant="outlined" color="inherit" onClick={() => loadSearchResults(searchQuery)} sx={{ fontSize: 12.25 }}>
              Refresh
            </Button>
          </Stack>

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", overflow: "auto" }}>
            <Table size="small" sx={{ "& th, & td": { fontSize: 12.25 } }}>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Code</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Name</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Reg. Name</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Contact Person</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Contact No</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Active</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Logged</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchLoading ? (
                  <TableRow>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary" }} colSpan={8}>
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : searchResults.length === 0 ? (
                  <TableRow>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary" }} colSpan={8}>
                      No companies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  searchResults.map((row) => (
                    <TableRow key={row.id} sx={{ color: "text.secondary", "&:nth-of-type(even)": { bgcolor: "action.hover" } }}>
                      <TableCell sx={{ borderColor: "divider" }}>{row.code || "-"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>{row.name || "-"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>{row.reg_name || "-"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>{row.contact_person || "-"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>{row.contact_no || "-"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>{row.is_active ? "Yes" : "No"}</TableCell>
                      <TableCell sx={{ borderColor: "divider", textTransform: "capitalize" }}>{row.admin_user?.login_status === "logged_in" ? "Logged in" : "Logged out"}</TableCell>
                      <TableCell sx={{ borderColor: "divider" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Button
                            type="button"
                            variant="text"
                            onClick={() => handleSelectCompany(row.id)}
                            sx={{ minWidth: "auto", p: 0, fontSize: 12.25 }}
                          >
                            Open
                          </Button>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => handleDeleteCompany(row)}
                            title="Delete company"
                            sx={{ display: "inline-flex", border: 0, bgcolor: "transparent", p: 0, cursor: "pointer", color: "error.main" }}
                          >
                            <Trash2 size={16} />
                          </Box>
                          {row.admin_user?.login_status === "logged_in" ? (
                            <Box
                              component="button"
                              type="button"
                              onClick={() => handleForceLogout(row)}
                              title="Logout company admin"
                              sx={{ display: "inline-flex", border: 0, bgcolor: "transparent", p: 0, cursor: "pointer", color: "warning.main" }}
                            >
                              <LogOut size={16} />
                            </Box>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xl: "repeat(2, 1fr)" } }}>
          <Box sx={{ ...cardSx, p: 1.5 }}>
            {form.vxAdminManaged ? (
              <Typography
                sx={{
                  mb: 1.5, fontSize: 10.5, color: "primary.main", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                  border: "1px solid", borderColor: "primary.main", borderRadius: "4px", px: 1, py: 0.75,
                }}
              >
                Name, Reg. Name, Contact Person, Contact No, GST No, City, PIN Code and State are set by your
                platform administrator (VX-Admin) for this store — view only here. To change one, reach out to
                VX-Admin.
              </Typography>
            ) : null}
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { md: "repeat(2, 1fr)" } }}>
              <InputField label="Code" required>
                <TextField size="small" fullWidth sx={fieldSx} value={form.code} onChange={setField("code")} />
              </InputField>
              <InputField label="Name" required>
                <TextField size="small" fullWidth sx={fieldSx} value={form.name} onChange={setField("name")} disabled={form.vxAdminManaged} />
              </InputField>

              <InputField label="Reg. Name" required>
                <TextField size="small" fullWidth sx={fieldSx} value={form.regName} onChange={setField("regName")} disabled={form.vxAdminManaged} />
              </InputField>
              <InputField label="Contact Person" required>
                <TextField size="small" fullWidth sx={fieldSx} value={form.contactPerson} onChange={setField("contactPerson")} disabled={form.vxAdminManaged} />
              </InputField>

              <InputField label="Contact No" required>
                <TextField size="small" fullWidth sx={fieldSx} value={form.contactNo} onChange={setField("contactNo")} disabled={form.vxAdminManaged} />
              </InputField>
              <InputField label="Admin Name">
                <TextField size="small" fullWidth sx={fieldSx} value={form.adminName} onChange={setField("adminName")} />
              </InputField>
              <InputField label="Admin Email">
                <TextField size="small" fullWidth sx={fieldSx} value={form.adminEmail} onChange={setField("adminEmail")} />
              </InputField>
              <InputField label="Admin Password">
                <TextField type="password" size="small" fullWidth sx={fieldSx} value={form.adminPassword} onChange={setField("adminPassword")} />
              </InputField>
              <InputField label="Email ID">
                <TextField size="small" fullWidth sx={fieldSx} value={form.emailId} onChange={setField("emailId")} />
              </InputField>

              <InputField label="Store Access Level" sx={{ gridColumn: { md: "span 2" } }}>
                <TextField select size="small" fullWidth sx={fieldSx} value={form.accessLevel} onChange={setField("accessLevel")}>
                  <MenuItem value="full">Full Access — all subscribed modules</MenuItem>
                  <MenuItem value="core">Core Only — Sales / Purchase / Store / Masters</MenuItem>
                  <MenuItem value="custom">Custom — choose modules</MenuItem>
                </TextField>
                {form.accessLevel === "custom" ? (
                  <Box sx={{ mt: 1, display: "grid", gap: 0.75, gridTemplateColumns: "repeat(2, 1fr)", border: "1px solid", borderColor: "divider", borderRadius: "4px", p: 1 }}>
                    {MODULE_SECTIONS.map((section) => {
                      const checked = (form.accessModules || []).includes(section.slug);
                      return (
                        <FormControlLabel
                          key={section.slug}
                          sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const set = new Set(prev.accessModules || []);
                                  if (e.target.checked) set.add(section.slug);
                                  else set.delete(section.slug);
                                  return { ...prev, accessModules: [...set] };
                                })
                              }
                            />
                          }
                          label={section.label}
                        />
                      );
                    })}
                  </Box>
                ) : (
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                    {form.accessLevel === "core"
                      ? "Core = Sales, Warehouse/Purchase, Masters (+ Dashboard). No Finance, Analytical, CRM, Store or Settings."
                      : "This store gets every module included in the subscription."}
                  </Typography>
                )}
              </InputField>

              <InputField label="Address" sx={{ gridColumn: { md: "span 2" } }}>
                <TextField multiline rows={2} size="small" fullWidth sx={fieldSx} value={form.address} onChange={setField("address")} />
              </InputField>

              <InputField label="City">
                <TextField select size="small" fullWidth sx={fieldSx} value={form.cityId} onChange={setField("cityId")} disabled={form.vxAdminManaged}>
                  <MenuItem value="">Select City</MenuItem>
                  {cityOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </InputField>
              <InputField label="PIN Code">
                <TextField size="small" fullWidth sx={fieldSx} value={form.pinCode} onChange={setField("pinCode")} disabled={form.vxAdminManaged} />
              </InputField>

              <InputField label="State">
                <TextField select size="small" fullWidth sx={fieldSx} value={form.stateId} onChange={setField("stateId")} disabled={form.vxAdminManaged}>
                  <MenuItem value="">Select State</MenuItem>
                  {stateOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </InputField>
              <InputField label="Country">
                <TextField select size="small" fullWidth sx={fieldSx} value={form.countryId} onChange={setField("countryId")}>
                  <MenuItem value="">Select Country</MenuItem>
                  {countryOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </InputField>

              <InputField label="Internal VendorMargin">
                <TextField type="number" size="small" fullWidth sx={fieldSx} value={form.internalVendorMargin} onChange={setField("internalVendorMargin")} />
              </InputField>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, alignItems: "end" }}>
                <FormControlLabel
                  sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                  control={<Checkbox size="small" checked={form.asSupplier} onChange={setField("asSupplier")} />}
                  label="As Supplier"
                />
                <FormControlLabel
                  sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                  control={<Checkbox size="small" checked={form.asCustomer} onChange={setField("asCustomer")} />}
                  label="As Customer"
                />
              </Box>

              <InputField label="GST No">
                <TextField size="small" fullWidth sx={fieldSx} value={form.gstNo} onChange={setField("gstNo")} disabled={form.vxAdminManaged} />
              </InputField>
              <InputField label="GST Username">
                <TextField size="small" fullWidth sx={fieldSx} value={form.gstUsername} onChange={setField("gstUsername")} />
              </InputField>

              <InputField label="EInvoice Username">
                <TextField size="small" fullWidth sx={fieldSx} value={form.einvoiceUsername} onChange={setField("einvoiceUsername")} />
              </InputField>
              <InputField label="EInvoice Password">
                <TextField type="password" size="small" fullWidth sx={fieldSx} value={form.einvoicePassword} onChange={setField("einvoicePassword")} />
              </InputField>

              <InputField label="GST Access Key">
                <TextField size="small" fullWidth sx={fieldSx} value={form.gstAccessKey} onChange={setField("gstAccessKey")} />
              </InputField>
              <InputField label="PF/ESI No">
                <TextField size="small" fullWidth sx={fieldSx} value={form.pfEsiNo} onChange={setField("pfEsiNo")} />
              </InputField>

              <InputField label="TAN/PAN">
                <TextField size="small" fullWidth sx={fieldSx} value={form.tanPan} onChange={setField("tanPan")} />
              </InputField>
              <InputField label="Bank A/C Name">
                <TextField size="small" fullWidth sx={fieldSx} value={form.bankAccountName} onChange={setField("bankAccountName")} />
              </InputField>

              <InputField label="Account No">
                <TextField size="small" fullWidth sx={fieldSx} value={form.accountNo} onChange={setField("accountNo")} />
              </InputField>
              <InputField label="IFSC">
                <TextField size="small" fullWidth sx={fieldSx} value={form.ifsc} onChange={setField("ifsc")} />
              </InputField>

              <InputField label="Website">
                <TextField size="small" fullWidth sx={fieldSx} value={form.website} onChange={setField("website")} />
              </InputField>
              <InputField label="Active">
                <FormControlLabel
                  sx={{ ml: 0, height: 34, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                  control={<Checkbox size="small" checked={form.active} onChange={setField("active")} />}
                  label="Is Active"
                />
              </InputField>

              <InputField label="Logo" sx={{ gridColumn: { md: "span 2" } }}>
                <Box component="input" type="file" accept="image/*" onChange={handleLogoChange} sx={{ fontSize: 12.25, color: "text.secondary" }} />
                {logoPreview && (
                  <Box
                    component="img"
                    src={logoPreview}
                    alt="Company logo"
                    sx={{ mt: 1, height: 64, width: 64, objectFit: "contain", border: "1px solid", borderColor: "divider", bgcolor: "common.white", borderRadius: 1 }}
                  />
                )}
              </InputField>
            </Box>
          </Box>

          <Box sx={{ ...cardSx, p: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 1.5 }}>Printer Configuration</Typography>

            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "repeat(6, 1fr)" }, alignItems: "end" }}>
              <InputField label="Location">
                <TextField size="small" fullWidth sx={fieldSx} value={printerRow.location} onChange={setPrinterField("location")} />
              </InputField>
              <InputField label="Server">
                <TextField size="small" fullWidth sx={fieldSx} value={printerRow.server} onChange={setPrinterField("server")} />
              </InputField>
              <InputField label="IP">
                <TextField size="small" fullWidth sx={fieldSx} value={printerRow.ip} onChange={setPrinterField("ip")} />
              </InputField>
              <InputField label="Port">
                <TextField size="small" fullWidth sx={fieldSx} value={printerRow.port} onChange={setPrinterField("port")} />
              </InputField>
              <InputField label="Type">
                <TextField select size="small" fullWidth sx={fieldSx} value={printerRow.type} onChange={setPrinterField("type")}>
                  {PRINTER_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </InputField>
              <Button
                type="button"
                onClick={handleAddPrinter}
                className="glass-btn glass-btn-primary"
                sx={{ height: 34 }}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ mt: 1.5, border: "1px solid", borderColor: "divider", borderRadius: "4px", minHeight: 260, maxHeight: 520, overflow: "auto" }}>
              {printerConfigurations.length === 0 ? (
                <Typography sx={{ fontSize: 12.25, color: "text.secondary", p: 1.5 }}>No printer configuration added yet.</Typography>
              ) : (
                <Table size="small" sx={{ "& th, & td": { fontSize: 12.25 } }}>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Location</TableCell>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Server</TableCell>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>IP</TableCell>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Port</TableCell>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Type</TableCell>
                      <TableCell sx={{ borderColor: "divider", color: "text.secondary", width: 56 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {printerConfigurations.map((row, idx) => (
                      <TableRow key={`${row.location}-${row.ip}-${idx}`} sx={{ color: "text.secondary", "&:nth-of-type(even)": { bgcolor: "action.hover" } }}>
                        <TableCell sx={{ borderColor: "divider" }}>{row.location}</TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>{row.server}</TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>{row.ip}</TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>{row.port}</TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>
                          {PRINTER_TYPE_OPTIONS.find((x) => x.value === row.type)?.label || row.type}
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>
                          <Button
                            type="button"
                            onClick={() => removePrinter(idx)}
                            className="glass-btn glass-btn-danger"
                            title="Remove"
                            sx={{ minWidth: "auto" }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default CompanySettings;
