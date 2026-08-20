import React, { useEffect, useState } from "react";
import { LogOut, PlusCircle, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

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

const InputField = ({ label, required = false, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </label>
    {children}
  </div>
);

const textInputClass =
  "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

// Master-data-of-record fields on a VX-Admin-provisioned store: view-only here, editable only from
// the platform admin portal (see the "vx_admin_managed" banner below Code/Name in the edit form).
const lockedInputClass =
  "w-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-sm p-1.5 text-sm cursor-not-allowed";

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

  if (loading) {
    return <div className="text-sm text-gray-600 dark:text-gray-300">Loading company setup...</div>;
  }

  return (
    <div className="space-y-3 pb-20">
      <div className="flex justify-between items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settings / Company</h1>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="inline-flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50"
            onClick={handleSyncFromAdmin}
            disabled={syncing}
            title="Pull the latest subscription, limits and login password from VX-Admin"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from VX-Admin"}
          </button>
          <button
            type="button"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            onClick={handleNew}
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            New
          </button>
          <button
            type="button"
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || showSearchPage}
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="glass-btn glass-btn-primary inline-flex items-center"
            onClick={handleOpenSearch}
          >
            <Search className="w-4 h-4 mr-1" />
            Search
          </button>
        </div>
      </div>

      {(overview.stores.length > 0 || overview.warehouses.length > 0) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-3">
          <h2 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">
            Stores &amp; Warehouses <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(synced from VX-Admin)</span>
          </h2>
          {/* One table rather than two side-by-side lists: a warehouse is a location under the same
              company as the stores, so it belongs in the same list distinguished by Store Type.
              Split columns made them look like unrelated things and hid warehouses entirely from
              anyone scanning the stores column. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-1.5 font-semibold">Name</th>
                  <th className="px-2 py-1.5 font-semibold">Store Type</th>
                  <th className="px-2 py-1.5 font-semibold">Tagged To</th>
                  <th className="px-2 py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ...overview.stores.map((s) => ({ ...s, __type: "Store" })),
                  ...overview.warehouses.map((w) => ({ ...w, __type: "Warehouse" })),
                ].map((row, i) => {
                  const tags = Array.isArray(row.store_tags)
                    ? row.store_tags.map((t) => t?.name).filter(Boolean)
                    : [];
                  const isWarehouse = row.__type === "Warehouse";
                  return (
                    <tr key={`${row.__type}-${row.code || i}`}>
                      <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{row.name || row.code}</td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            isWarehouse
                              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                              : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                          }`}
                        >
                          {row.__type}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {isWarehouse
                          ? (tags.length > 0 ? tags.join(", ") : "Not tagged to any store")
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${row.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSearchPage ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name"
              className={`${textInputClass} max-w-md`}
            />
            <button
              type="button"
              onClick={() => loadSearchResults(searchQuery)}
              className="px-3 py-1.5 text-sm rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Code</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Name</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Reg. Name</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Contact Person</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Contact No</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Active</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Logged</th>
                  <th className="text-left px-2 py-2 border-b dark:border-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {searchLoading ? (
                  <tr>
                    <td className="px-2 py-3 text-gray-500 dark:text-gray-400" colSpan={8}>
                      Loading companies...
                    </td>
                  </tr>
                ) : searchResults.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-gray-500 dark:text-gray-400" colSpan={8}>
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  searchResults.map((row) => (
                    <tr key={row.id} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.code || "-"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.name || "-"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.reg_name || "-"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.contact_person || "-"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.contact_no || "-"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">{row.is_active ? "Yes" : "No"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700 capitalize">{row.admin_user?.login_status === "logged_in" ? "Logged in" : "Logged out"}</td>
                      <td className="px-2 py-2 border-b dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSelectCompany(row.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(row)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Delete company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {row.admin_user?.login_status === "logged_in" ? (
                            <button
                              type="button"
                              onClick={() => handleForceLogout(row)}
                              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                              title="Logout company admin"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-3">
            {form.vxAdminManaged ? (
              <p className="mb-3 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm px-2 py-1.5">
                Name, Reg. Name, Contact Person, Contact No, GST No, City, PIN Code and State are set by your
                platform administrator (VX-Admin) for this store — view only here. To change one, reach out to
                VX-Admin.
              </p>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputField label="Code" required>
                <input value={form.code} onChange={setField("code")} className={textInputClass} />
              </InputField>
              <InputField label="Name" required>
                <input
                  value={form.name}
                  onChange={setField("name")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>

              <InputField label="Reg. Name" required>
                <input
                  value={form.regName}
                  onChange={setField("regName")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>
              <InputField label="Contact Person" required>
                <input
                  value={form.contactPerson}
                  onChange={setField("contactPerson")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>

              <InputField label="Contact No" required>
                <input
                  value={form.contactNo}
                  onChange={setField("contactNo")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>
              <InputField label="Admin Name">
                <input value={form.adminName} onChange={setField("adminName")} className={textInputClass} />
              </InputField>
              <InputField label="Admin Email">
                <input value={form.adminEmail} onChange={setField("adminEmail")} className={textInputClass} />
              </InputField>
              <InputField label="Admin Password">
                <input type="password" value={form.adminPassword} onChange={setField("adminPassword")} className={textInputClass} />
              </InputField>
              <InputField label="Email ID">
                <input value={form.emailId} onChange={setField("emailId")} className={textInputClass} />
              </InputField>

              <InputField label="Store Access Level" className="md:col-span-2">
                <select value={form.accessLevel} onChange={setField("accessLevel")} className={textInputClass}>
                  <option value="full">Full Access — all subscribed modules</option>
                  <option value="core">Core Only — Sales / Purchase / Store / Masters</option>
                  <option value="custom">Custom — choose modules</option>
                </select>
                {form.accessLevel === "custom" ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-sm border border-gray-200 dark:border-gray-700 p-2">
                    {MODULE_SECTIONS.map((section) => {
                      const checked = (form.accessModules || []).includes(section.slug);
                      return (
                        <label key={section.slug} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
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
                          {section.label}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {form.accessLevel === "core"
                      ? "Core = Sales, Warehouse/Purchase, Masters (+ Dashboard). No Finance, Analytical, CRM, Store or Settings."
                      : "This store gets every module included in the subscription."}
                  </p>
                )}
              </InputField>

              <InputField label="Address" className="md:col-span-2">
                <textarea
                  value={form.address}
                  onChange={setField("address")}
                  rows={2}
                  className={textInputClass}
                />
              </InputField>

              <InputField label="City">
                <select
                  value={form.cityId}
                  onChange={setField("cityId")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                >
                  <option value="">Select City</option>
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="PIN Code">
                <input
                  value={form.pinCode}
                  onChange={setField("pinCode")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>

              <InputField label="State">
                <select
                  value={form.stateId}
                  onChange={setField("stateId")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                >
                  <option value="">Select State</option>
                  {stateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Country">
                <select value={form.countryId} onChange={setField("countryId")} className={textInputClass}>
                  <option value="">Select Country</option>
                  {countryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </InputField>

              <InputField label="Internal VendorMargin">
                <input
                  type="number"
                  value={form.internalVendorMargin}
                  onChange={setField("internalVendorMargin")}
                  className={textInputClass}
                />
              </InputField>
              <div className="grid grid-cols-2 gap-2 items-end">
                <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 gap-2">
                  <input
                    type="checkbox"
                    checked={form.asSupplier}
                    onChange={setField("asSupplier")}
                    className="h-4 w-4"
                  />
                  As Supplier
                </label>
                <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 gap-2">
                  <input
                    type="checkbox"
                    checked={form.asCustomer}
                    onChange={setField("asCustomer")}
                    className="h-4 w-4"
                  />
                  As Customer
                </label>
              </div>

              <InputField label="GST No">
                <input
                  value={form.gstNo}
                  onChange={setField("gstNo")}
                  disabled={form.vxAdminManaged}
                  className={form.vxAdminManaged ? lockedInputClass : textInputClass}
                />
              </InputField>
              <InputField label="GST Username">
                <input value={form.gstUsername} onChange={setField("gstUsername")} className={textInputClass} />
              </InputField>

              <InputField label="EInvoice Username">
                <input
                  value={form.einvoiceUsername}
                  onChange={setField("einvoiceUsername")}
                  className={textInputClass}
                />
              </InputField>
              <InputField label="EInvoice Password">
                <input
                  type="password"
                  value={form.einvoicePassword}
                  onChange={setField("einvoicePassword")}
                  className={textInputClass}
                />
              </InputField>

              <InputField label="GST Access Key">
                <input value={form.gstAccessKey} onChange={setField("gstAccessKey")} className={textInputClass} />
              </InputField>
              <InputField label="PF/ESI No">
                <input value={form.pfEsiNo} onChange={setField("pfEsiNo")} className={textInputClass} />
              </InputField>

              <InputField label="TAN/PAN">
                <input value={form.tanPan} onChange={setField("tanPan")} className={textInputClass} />
              </InputField>
              <InputField label="Bank A/C Name">
                <input value={form.bankAccountName} onChange={setField("bankAccountName")} className={textInputClass} />
              </InputField>

              <InputField label="Account No">
                <input value={form.accountNo} onChange={setField("accountNo")} className={textInputClass} />
              </InputField>
              <InputField label="IFSC">
                <input value={form.ifsc} onChange={setField("ifsc")} className={textInputClass} />
              </InputField>

              <InputField label="Website">
                <input value={form.website} onChange={setField("website")} className={textInputClass} />
              </InputField>
              <InputField label="Active">
                <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 gap-2 h-[34px]">
                  <input type="checkbox" checked={form.active} onChange={setField("active")} className="h-4 w-4" />
                  Is Active
                </label>
              </InputField>

              <InputField label="Logo" className="md:col-span-2">
                <input type="file" accept="image/*" onChange={handleLogoChange} className={textInputClass} />
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="mt-2 h-16 w-16 object-contain border border-gray-200 dark:border-gray-600 dark:bg-white rounded"
                  />
                )}
              </InputField>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Printer Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
              <InputField label="Location">
                <input value={printerRow.location} onChange={setPrinterField("location")} className={textInputClass} />
              </InputField>
              <InputField label="Server">
                <input value={printerRow.server} onChange={setPrinterField("server")} className={textInputClass} />
              </InputField>
              <InputField label="IP">
                <input value={printerRow.ip} onChange={setPrinterField("ip")} className={textInputClass} />
              </InputField>
              <InputField label="Port">
                <input value={printerRow.port} onChange={setPrinterField("port")} className={textInputClass} />
              </InputField>
              <InputField label="Type">
                <select value={printerRow.type} onChange={setPrinterField("type")} className={textInputClass}>
                  {PRINTER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </InputField>
              <button
                type="button"
                onClick={handleAddPrinter}
                className="glass-btn glass-btn-primary h-[34px] inline-flex items-center justify-center"
              >
                Add
              </button>
            </div>

            <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-sm min-h-[260px] max-h-[520px] overflow-auto">
              {printerConfigurations.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3">No printer configuration added yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <tr>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700">Location</th>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700">Server</th>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700">IP</th>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700">Port</th>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700">Type</th>
                      <th className="text-left px-2 py-2 border-b dark:border-gray-700 w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printerConfigurations.map((row, idx) => (
                      <tr key={`${row.location}-${row.ip}-${idx}`} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                        <td className="px-2 py-2 border-b dark:border-gray-700">{row.location}</td>
                        <td className="px-2 py-2 border-b dark:border-gray-700">{row.server}</td>
                        <td className="px-2 py-2 border-b dark:border-gray-700">{row.ip}</td>
                        <td className="px-2 py-2 border-b dark:border-gray-700">{row.port}</td>
                        <td className="px-2 py-2 border-b dark:border-gray-700">
                          {PRINTER_TYPE_OPTIONS.find((x) => x.value === row.type)?.label || row.type}
                        </td>
                        <td className="px-2 py-2 border-b dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => removePrinter(idx)}
                            className="glass-btn glass-btn-danger"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySettings;
