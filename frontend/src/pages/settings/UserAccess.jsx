import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, Pencil, PlusCircle, Save, Search, Store, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import { Box, Button, Checkbox, FormControlLabel, IconButton, Stack, Typography } from "@mui/material";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import PermissionMatrix from "../../components/PermissionMatrix";
import Breadcrumbs from "../../components/Breadcrumbs";
import {
  hasAnyViewPermission,
  setPermissionAction,
  setSectionAction,
} from "../../utils/permissionMatrixActions";
import {
  collapseToFullAccess,
  createEmptyPermissionMap,
  expandFullAccess,
  hasFullAccess,
  normalizePagePermissions,
} from "../../utils/pagePermissionCatalog";
import {
  extractUserRolePreset,
  getUserRolePresetPermissions,
  USER_ROLE_PRESET_OPTIONS,
} from "../../utils/userRolePresets";
import { TextInput, SelectInput, MultiSelectInput } from "./userAccessFormControls";
import StoreGroupsDrawer from "./StoreGroupsDrawer";

// Intersects two entitlement `sections` maps: a module survives only when both grant it, and page
// lists are intersected ("all" acts as the full set for that section). Drives the multi-store cap so a
// user assigned to several stores can only be given modules ALL of those stores purchased.
const intersectSections = (a, b) => {
  const out = {};
  for (const slug of Object.keys(a)) {
    if (!(slug in b)) continue;
    const av = a[slug];
    const bv = b[slug];
    const al = av === "all" ? null : Array.isArray(av) ? av : [];
    const bl = bv === "all" ? null : Array.isArray(bv) ? bv : [];
    if (al === null && bl === null) {
      out[slug] = "all";
    } else if (al === null) {
      out[slug] = bl;
    } else if (bl === null) {
      out[slug] = al;
    } else {
      const set = new Set(bl);
      const inter = al.filter((path) => set.has(path));
      if (inter.length) out[slug] = inter;
    }
  }
  return out;
};

// The set of module slugs a store grants (view-able), or null when the store is unrestricted.
const grantedModuleSlugs = (ent) => {
  const sections = ent && typeof ent === "object" ? ent.sections : null;
  if (!sections || typeof sections !== "object") return null;
  return Object.keys(sections)
    .filter((slug) => sections[slug] === "all" || (Array.isArray(sections[slug]) && sections[slug].length > 0))
    .sort();
};

// Folds a list of per-store entitlements into their intersection. A null/absent store entitlement is
// unrestricted and does not constrain the result; all-null yields null (no filtering).
const intersectStoreEntitlements = (list) => {
  let acc;
  let seeded = false;
  for (const ent of list) {
    const sections = ent && typeof ent === "object" ? ent.sections : null;
    if (!sections || typeof sections !== "object") continue;
    if (!seeded) {
      acc = sections;
      seeded = true;
    } else {
      acc = intersectSections(acc, sections);
    }
  }
  return seeded ? { sections: acc } : null;
};

const createDefaultUserForm = (authUser) => ({
  companyId: String(authUser?.role || "").toLowerCase() === "admin" ? String(authUser?.company_id || "") : "",
  companyIds: String(authUser?.role || "").toLowerCase() === "admin" && authUser?.company_id ? [String(authUser.company_id)] : [],
  name: "",
  email: "",
  password: "",
  role: "user",
  accessGroupId: "",
  // Which Store Group (a named set of stores — see StoreGroupsDrawer) this user inherits store
  // access from. Distinct from accessGroupId above, which is about page PERMISSIONS, not stores.
  storeGroupId: "",
  manualPermissions: createEmptyPermissionMap(),
  isActive: "active",
  // The account's real role, as opposed to the preset above. Only a store admin ('admin') is
  // treated specially: this page creates 'user' accounts, but it is also the only place a store
  // admin's matrix can be narrowed.
  accountRole: "user",
});

const createDefaultGroupForm = () => ({
  name: "",
  permissions: createEmptyPermissionMap(),
});

const UserAccess = () => {
  const navigate = useNavigate();
  const { entity } = useParams();
  const authUser = useSelector((state) => state.auth.user);
  const role = String(authUser?.role || "").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const canManage = isSuperAdmin || isAdmin;

  const [showSearchPage, setShowSearchPage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState(() => USER_ROLE_PRESET_OPTIONS.map((option) => option.value));
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [userForm, setUserForm] = useState(() => createDefaultUserForm(authUser));
  const [groupForm, setGroupForm] = useState(createDefaultGroupForm);

  // Store Groups — named sets of the super-admin's own stores, assignable to a user so they get
  // access to every store in the group at once. Kept separate from `groups` (Access Groups) above,
  // which are about page permissions, not stores. Managed via the StoreGroupsDrawer overlay.
  const [storeGroups, setStoreGroups] = useState([]);
  const [loadingStoreGroups, setLoadingStoreGroups] = useState(false);
  const [savingStoreGroup, setSavingStoreGroup] = useState(false);
  const [showStoreGroupsDrawer, setShowStoreGroupsDrawer] = useState(false);

  const activeTab = String(entity || "").toLowerCase() === "group" ? "group" : "user";
  const entityTitle = activeTab === "group" ? "Create Group" : "Create User";
  const listTitle = activeTab === "group" ? "Access Groups (what they can do)" : "Users";

  const selectedCompanyIds = useMemo(() => {
    if (isSuperAdmin) return userForm.companyIds;
    return userForm.companyId ? [userForm.companyId] : [];
  }, [isSuperAdmin, userForm.companyId, userForm.companyIds]);

  const companyNameById = useMemo(
    () => new Map(companies.map((company) => [String(company.id), company.name])),
    [companies]
  );

  const companyEntitlementsById = useMemo(
    () => new Map(companies.map((company) => [String(company.id), company.entitlements || null])),
    [companies]
  );

  // Only stores that still exist on the control plane can be ASSIGNED. A store removed in VX-Admin
  // is deactivated rather than deleted (historical orders keep a valid FK), so it has to stay in
  // `companies` for companyNameById to keep rendering existing assignments -- but offering it in a
  // picker would let someone assign a user to a store that is gone.
  const selectableCompanies = useMemo(
    () => companies.filter((company) => company.is_active !== false),
    [companies]
  );

  // Same source list the super-admin's Company multi-select below already uses — a Store Group is
  // just a named subset of these same stores.
  const storeGroupStoreOptions = useMemo(
    () => selectableCompanies.map((company) => ({ value: String(company.id), label: company.name })),
    [selectableCompanies]
  );

  const storeGroupOptions = useMemo(
    () => storeGroups.map((group) => ({ value: String(group.id), label: group.name })),
    [storeGroups]
  );

  // The module ceiling for the store(s) this user is being assigned to. Null = unrestricted (no store
  // selected yet, or every selected store is unrestricted) => the matrix shows the full catalog.
  const selectedStoreEntitlements = useMemo(() => {
    if (!selectedCompanyIds.length) return null;
    return intersectStoreEntitlements(
      selectedCompanyIds.map((id) => companyEntitlementsById.get(String(id)) || null)
    );
  }, [selectedCompanyIds, companyEntitlementsById]);

  // True when 2+ selected stores offer different module sets, so the grid below is showing only the
  // modules common to all of them. Surfaced as a hint so the admin understands the narrowing.
  const selectedStoresDifferInModules = useMemo(() => {
    if (selectedCompanyIds.length < 2) return false;
    const signatures = selectedCompanyIds.map((id) => {
      const slugs = grantedModuleSlugs(companyEntitlementsById.get(String(id)) || null);
      return slugs === null ? "*" : slugs.join(",");
    });
    return new Set(signatures).size > 1;
  }, [selectedCompanyIds, companyEntitlementsById]);

  const selectedCompanyName = useMemo(() => {
    const company = companies.find((item) => String(item.id) === String(userForm.companyId));
    return company?.name || "-";
  }, [companies, userForm.companyId]);

  const availableGroups = useMemo(() => {
    if (!isSuperAdmin) return groups;
    if (!selectedCompanyIds.length) return groups.filter((group) => !group.company_id);
    const selectedIdSet = new Set(selectedCompanyIds.map(String));
    return groups.filter((group) => !group.company_id || selectedIdSet.has(String(group.company_id)));
  }, [groups, isSuperAdmin, selectedCompanyIds]);

  const accessGroupOptions = useMemo(() => {
    const compatibleCompanyIds = new Set(selectedCompanyIds.map(String));
    return groups.map((group) => {
      const companyLabel = group.company?.name ? ` - ${group.company.name}` : " - All Companies";
      const isCompatible =
        !isSuperAdmin ||
        !group.company_id ||
        !selectedCompanyIds.length ||
        compatibleCompanyIds.has(String(group.company_id));

      return {
        value: String(group.id),
        label: `${group.name}${companyLabel}${isCompatible ? "" : " (not in selected companies)"}`,
        disabled: !isCompatible,
      };
    });
  }, [groups, isSuperAdmin, selectedCompanyIds]);

  const selectedAccessGroup = useMemo(
    () => availableGroups.find((group) => String(group.id) === String(userForm.accessGroupId)) || null,
    [availableGroups, userForm.accessGroupId]
  );

  // A store admin is created with their store, not here: their identity and store binding belong to
  // the store, so only their permissions are editable.
  const editingStoreAdmin = userForm.accountRole === "admin";
  const storeAdminFullAccess = editingStoreAdmin && hasFullAccess(userForm.manualPermissions);

  const toggleStoreAdminFullAccess = (full) => {
    setUserForm((prev) => ({
      ...prev,
      // Narrowing starts from what the admin can do today — every page — so the operator takes
      // things away rather than rebuilding their access from an empty grid.
      manualPermissions: full ? collapseToFullAccess() : expandFullAccess(),
    }));
  };

  const displayedUserPermissions = useMemo(
    () => (selectedAccessGroup ? normalizePagePermissions(selectedAccessGroup.page_permissions) : normalizePagePermissions(userForm.manualPermissions)),
    [selectedAccessGroup, userForm.manualPermissions]
  );

  useEffect(() => {
    if (!userForm.accessGroupId) return;
    if (availableGroups.some((group) => String(group.id) === String(userForm.accessGroupId))) return;
    setUserForm((prev) => ({ ...prev, accessGroupId: "" }));
  }, [availableGroups, userForm.accessGroupId]);

  const loadRows = async () => {
    setLoading(true);
    // GET /user-access only ever returns a flat, paginated list of users - there is no
    // combined users+groups+companies+roles payload on the backend. Fetch each real,
    // independently-working endpoint instead of expecting a bundle that was never built.
    const [usersRes, groupsRes, companiesRes] = await Promise.allSettled([
      api.get("/user-access", { params: { all: true } }),
      api.get("/user-access/groups"),
      api.get("/companies", { params: { includeInactive: true, limit: 500 } }),
    ]);

    if (usersRes.status === "fulfilled") {
      setUsers(Array.isArray(usersRes.value.data?.data) ? usersRes.value.data.data : []);
    } else {
      setUsers([]);
      toast.error(usersRes.reason?.response?.data?.message || "Failed to load users");
    }
    setGroups(groupsRes.status === "fulfilled" && Array.isArray(groupsRes.value.data?.data) ? groupsRes.value.data.data : []);
    setCompanies(companiesRes.status === "fulfilled" && Array.isArray(companiesRes.value.data?.data) ? companiesRes.value.data.data : []);
    // No backend endpoint enumerates distinct account roles - the preset list is the real,
    // already-established source of truth for this (see userRolePresets.js).
    setRoles(USER_ROLE_PRESET_OPTIONS.map((option) => option.value));
    setLoading(false);
  };

  useEffect(() => {
    if (!canManage) return;
    loadRows();
  }, [canManage]);

  const loadStoreGroups = async () => {
    try {
      setLoadingStoreGroups(true);
      const res = await api.get("/user-access/store-groups");
      setStoreGroups(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load store groups");
    } finally {
      setLoadingStoreGroups(false);
    }
  };

  // Store Groups are a super-admin-only concept (a single-store admin has nothing to group).
  useEffect(() => {
    if (!isSuperAdmin) return;
    loadStoreGroups();
  }, [isSuperAdmin]);

  const resetUserEditor = () => {
    setEditingUserId(null);
    setUserForm(createDefaultUserForm(authUser));
    setShowSearchPage(true);
  };

  const resetGroupEditor = () => {
    setEditingGroupId(null);
    setGroupForm(createDefaultGroupForm());
    setShowSearchPage(true);
  };

  const handleBackClick = () => {
    if (showSearchPage) {
      navigate("/user-access");
      return;
    }
    setShowSearchPage(true);
  };

  const handleSearchClick = () => {
    setShowSearchPage(true);
  };

  const handleNew = () => {
    if (activeTab === "user") {
      setEditingUserId(null);
      setUserForm(createDefaultUserForm(authUser));
    } else {
      setEditingGroupId(null);
      setGroupForm(createDefaultGroupForm());
    }
    setShowSearchPage(false);
  };

  const handleEditUser = (row) => {
    const companyIds =
      Array.isArray(row.company_ids) && row.company_ids.length
        ? row.company_ids.map((value) => String(value))
        : row.store_id || row.company_id
          ? [String(row.store_id || row.company_id)]
          : [];
    setEditingUserId(row.id);
    setUserForm({
      companyId: companyIds[0] || (isAdmin ? String(authUser?.company_id || "") : ""),
      companyIds,
      name: row.name || "",
      email: row.email || "",
      password: "",
      role: extractUserRolePreset(row.access_roles),
      accessGroupId: row.access_group_id ? String(row.access_group_id) : "",
      storeGroupId: row.store_group_id ? String(row.store_group_id) : "",
      manualPermissions: normalizePagePermissions(row.page_permissions),
      isActive: row.is_active ? "active" : "inactive",
      accountRole: String(row.role || "user").toLowerCase(),
    });
    setShowSearchPage(false);
  };

  const handleEditGroup = (row) => {
    setEditingGroupId(row.id);
    setGroupForm({
      name: row.name || "",
      permissions: normalizePagePermissions(row.page_permissions),
    });
    setShowSearchPage(false);
  };

  const handleDeleteUser = async (row) => {
    if (!window.confirm(`Delete ${row.name || row.email}?`)) return;
    try {
      await api.delete(`/user-access/${row.id}`);
      toast.success("User deleted");
      if (String(editingUserId) === String(row.id)) resetUserEditor();
      await loadRows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleDeleteGroup = async (row) => {
    if (!window.confirm(`Delete group ${row.name}?`)) return;
    try {
      await api.delete(`/user-access/groups/${row.id}`);
      toast.success("Group deleted");
      if (String(editingGroupId) === String(row.id)) resetGroupEditor();
      await loadRows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete group");
    }
  };

  // Called by StoreGroupsDrawer. Returns true on success so the drawer knows to leave the
  // create/edit form and go back to its list, false to stay put (validation or API failure).
  const handleSaveStoreGroup = async ({ id, name, storeCompanyIds }) => {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      toast.error("Store group name is required");
      return false;
    }
    if (!storeCompanyIds.length) {
      toast.error("Select at least one store");
      return false;
    }

    const payload = { name: trimmedName, storeCompanyIds: storeCompanyIds.map(Number) };

    try {
      setSavingStoreGroup(true);
      if (id) {
        await api.put(`/user-access/store-groups/${id}`, payload);
        toast.success("Store group updated");
      } else {
        await api.post("/user-access/store-groups", payload);
        toast.success("Store group created");
      }
      await loadStoreGroups();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save store group");
      return false;
    } finally {
      setSavingStoreGroup(false);
    }
  };

  const handleDeleteStoreGroup = async (row) => {
    try {
      await api.delete(`/user-access/store-groups/${row.id}`);
      toast.success("Store group deleted");
      await loadStoreGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete store group");
    }
  };

  const handleForceLogout = async (row) => {
    try {
      await api.post(`/user-access/${row.id}/force-logout`);
      toast.success("User logged out");
      await loadRows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to logout user");
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.email.trim() || (!editingUserId && !userForm.password.trim())) {
      toast.error("Email and password are required");
      return;
    }
    if (isSuperAdmin && !userForm.companyIds.length) {
      toast.error("Select at least one company");
      return;
    }
    if (!userForm.accessGroupId && !hasAnyViewPermission(userForm.manualPermissions)) {
      toast.error("Select at least one page with view access");
      return;
    }

    const companyIds = isSuperAdmin ? userForm.companyIds : userForm.companyId ? [userForm.companyId] : [];

    const payload = {
      companyId: companyIds[0] || "",
      companyIds,
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      role: userForm.role,
      accessGroupId: userForm.accessGroupId || null,
      storeGroupId: userForm.storeGroupId ? Number(userForm.storeGroupId) : null,
      pagePermissions: selectedAccessGroup ? {} : normalizePagePermissions(userForm.manualPermissions),
      isActive: userForm.isActive,
    };

    try {
      setSaving(true);
      if (editingUserId) {
        await api.put(`/user-access/${editingUserId}`, payload);
        toast.success("User updated");
      } else {
        await api.post("/user-access", payload);
        toast.success("User created");
      }
      resetUserEditor();
      await loadRows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (!hasAnyViewPermission(groupForm.permissions)) {
      toast.error("Select at least one page with view access");
      return;
    }

    const payload = {
      name: groupForm.name.trim(),
      pagePermissions: normalizePagePermissions(groupForm.permissions),
    };

    try {
      setSaving(true);
      if (editingGroupId) {
        await api.put(`/user-access/groups/${editingGroupId}`, payload);
        toast.success("Group updated");
      } else {
        await api.post("/user-access/groups", payload);
        toast.success("Group created");
      }
      resetGroupEditor();
      await loadRows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const updateUserPermission = (path, action, checked) => {
    setUserForm((prev) => ({
      ...prev,
      manualPermissions: setPermissionAction(prev.manualPermissions, path, action, checked),
    }));
  };

  const updateUserSectionPermission = (section, action, checked) => {
    setUserForm((prev) => ({
      ...prev,
      manualPermissions: setSectionAction(prev.manualPermissions, section.pages.map((page) => page.path), action, checked),
    }));
  };

  const updateGroupPermission = (path, action, checked) => {
    setGroupForm((prev) => ({
      ...prev,
      permissions: setPermissionAction(prev.permissions, path, action, checked),
    }));
  };

  const updateGroupSectionPermission = (section, action, checked) => {
    setGroupForm((prev) => ({
      ...prev,
      permissions: setSectionAction(prev.permissions, section.pages.map((page) => page.path), action, checked),
    }));
  };

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    setUserForm((prev) => ({
      ...prev,
      role: nextRole,
      accessGroupId: "",
      manualPermissions: getUserRolePresetPermissions(nextRole),
    }));
  };

  const getUserCompanyNames = (row) => {
    // The real /user-access response scopes a user to a store via store_id/store (not
    // company_id/company - those never exist on the actual User model), matching the
    // store_id-based scoping convention used everywhere else in this backend.
    const ids =
      Array.isArray(row.company_ids) && row.company_ids.length
        ? row.company_ids.map((value) => String(value))
        : row.store_id || row.company_id
          ? [String(row.store_id || row.company_id)]
          : [];
    if (!ids.length) return row.store?.name || row.company?.name || "--";
    const names = ids.map((id) => companyNameById.get(id) || row.store?.name || row.company?.name || `Company ${id}`);
    return [...new Set(names)].join(", ");
  };

  const userColumns = [
    { key: "name", label: "User Name", render: (_, row) => row.name || row.email || "--" },
    { key: "company", label: "Company", render: (_, row) => getUserCompanyNames(row), searchValue: (row) => getUserCompanyNames(row) },
    {
      key: "login_status",
      label: "Logged",
      render: (value) => (value === "logged_in" ? "Logged in" : "Logged out"),
    },
  ];

  const groupColumns = [
    { key: "name", label: "Group Name" },
    { key: "company", label: "Company", render: (_, row) => row.company?.name || "All Companies", searchValue: (row) => row.company?.name || "All Companies" },
    { key: "user_count", label: "Users" },
  ];

  if (!canManage) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography component="h1" sx={{ fontSize: 17.5, fontWeight: 700, color: "text.primary" }}>User and Access</Typography>
        <Typography sx={{ mt: 1, fontSize: 12.25, color: "text.secondary" }}>You do not have permission to view this page.</Typography>
      </Box>
    );
  }

  return (
    <Box className="master-responsive" sx={{ display: "flex", height: "100%", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1, boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={handleBackClick} sx={{ color: "text.secondary" }} aria-label="Back">
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 13, fontWeight: 600 }}
            items={[
              { label: "User Access", onClick: () => navigate("/user-access") },
              { label: entityTitle },
            ]}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
          <Button className="topbar-action-btn topbar-action-new" onClick={handleNew} type="button">
            <PlusCircle size={16} style={{ marginRight: 4 }} /> New
          </Button>
          <Box component="span">|</Box>
          {!showSearchPage ? (
            <>
              <Button
                type="button"
                className="glass-btn glass-btn-success"
                onClick={activeTab === "user" ? handleSaveUser : handleSaveGroup}
                disabled={saving}
              >
                <Save size={16} style={{ marginRight: 4 }} /> {saving ? "Saving..." : "Save"}
              </Button>
              <Box component="span">|</Box>
            </>
          ) : null}
          <Button type="button" className="glass-btn glass-btn-primary" onClick={handleSearchClick}>
            <Search size={16} style={{ marginRight: 4 }} /> Search
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ minHeight: 0, flex: 1, p: 2 }}>
        {showSearchPage ? (
          <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 3, p: 2 }}>
            <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>{listTitle}</Typography>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>
                  {activeTab === "user" ? "Manage user accounts and assigned company access." : "Manage reusable page-access groups."}
                </Typography>
              </Box>
              {isSuperAdmin ? (
                <Button
                  type="button"
                  onClick={() => setShowStoreGroupsDrawer(true)}
                  className="glass-btn glass-btn-secondary"
                  title="Group your stores together to assign store access in bulk"
                >
                  <Store size={16} style={{ marginRight: 4 }} /> Store Groups (which stores)
                </Button>
              ) : null}
            </Stack>

            <FilterableDataTable
              rows={activeTab === "user" ? users : groups}
              columns={activeTab === "user" ? userColumns : groupColumns}
              loading={loading}
              emptyText={activeTab === "user" ? "No users found." : "No groups found."}
              searchPlaceholder={activeTab === "user" ? "Search users..." : "Search groups..."}
              showExport={false}
              tablePreferenceKey={activeTab === "user" ? "user-access-users" : "user-access-groups"}
              renderActions={(row) => (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Button
                    type="button"
                    onClick={() => (activeTab === "user" ? handleEditUser(row) : handleEditGroup(row))}
                    className="glass-btn glass-btn-primary"
                    title="Edit"
                    sx={{ minWidth: "auto" }}
                  >
                    <Pencil size={14} />
                  </Button>
                  {activeTab === "user" && String(row.role || "").toLowerCase() === "admin" ? null : (
                    <Button
                      type="button"
                      onClick={() => (activeTab === "user" ? handleDeleteUser(row) : handleDeleteGroup(row))}
                      className="glass-btn glass-btn-danger"
                      title="Delete"
                      sx={{ minWidth: "auto" }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                  {activeTab === "user" && row.login_status === "logged_in" ? (
                    <Button
                      type="button"
                      onClick={() => handleForceLogout(row)}
                      className="glass-btn glass-btn-secondary"
                      title="Logout"
                      sx={{ minWidth: "auto" }}
                    >
                      <LogOut size={14} />
                    </Button>
                  ) : null}
                </Stack>
              )}
              searchButtonClassName="glass-btn glass-btn-primary"
            />
          </Box>
        ) : (
          <Box sx={{ height: "100%", overflow: "hidden", borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 3, p: 2 }}>
            <Box sx={{ display: "grid", height: "100%", minHeight: 0, gridTemplateColumns: "repeat(12, 1fr)", gap: 3 }}>
              <Stack spacing={2} sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, minHeight: 0, overflow: "auto", pr: 2 }}>
                <Typography component="h2" sx={{ borderBottom: 1, borderColor: "divider", pb: 1, fontSize: 14, fontWeight: 700, color: "text.primary" }}>{activeTab === "user" ? (editingUserId ? "Edit User" : "Create User") : editingGroupId ? "Edit Group" : "Create Group"}</Typography>

                {activeTab === "user" ? (
                  <>
                    {isSuperAdmin ? (
                      <>
                        <MultiSelectInput
                          label="Company"
                          required
                          value={userForm.companyIds}
                          onChange={(nextCompanyIds) =>
                            setUserForm((prev) => ({
                              ...prev,
                              companyId: nextCompanyIds[0] || "",
                              companyIds: nextCompanyIds,
                              accessGroupId: "",
                            }))
                          }
                          options={selectableCompanies.map((company) => ({ value: String(company.id), label: company.name }))}
                          helperText="Use Ctrl/Cmd to select multiple companies."
                        />
                        {selectedStoresDifferInModules ? (
                          <Typography
                            sx={{
                              ml: "33%", borderRadius: "4px", border: "1px solid", borderColor: "warning.main",
                              bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                              px: 1, py: 0.75, fontSize: 10.5, color: "warning.dark",
                            }}
                          >
                            These stores don’t offer the same modules — the grid below shows only modules common to all of
                            them. To give different access per store, create a separate user for each store.
                          </Typography>
                        ) : null}
                      </>
                    ) : (
                      <Stack direction="row" sx={{ alignItems: "center" }}>
                        <Typography component="label" sx={{ width: "33.333%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Company</Typography>
                        <Box sx={{ ml: 1.5, flex: 1, borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", color: "text.primary", p: 1, fontSize: 12.25 }}>{selectedCompanyName}</Box>
                      </Stack>
                    )}

                    {editingStoreAdmin ? (
                      <Stack spacing={1} sx={{ gridColumn: "span 12", borderRadius: "5.25px", border: "1px solid", borderColor: "info.main", bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.2 : 0.08), p: 1.5 }}>
                        <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "info.dark" }}>
                          Store admin — {userForm.name || userForm.email}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: "info.dark" }}>
                          This account was created with its store, so its name, sign-in details and store
                          cannot be changed here. It is already limited to this store and to the modules the
                          store subscribes to — below you choose what it may do inside them.
                        </Typography>
                        <FormControlLabel
                          sx={{ ml: 0, pt: 0.5, "& .MuiFormControlLabel-label": { fontSize: 12.25, fontWeight: 600, color: "info.dark" } }}
                          control={
                            <Checkbox
                              size="small"
                              checked={storeAdminFullAccess}
                              onChange={(event) => toggleStoreAdminFullAccess(event.target.checked)}
                            />
                          }
                          label="Full access to this store"
                        />
                        <Typography sx={{ fontSize: 10.5, color: "info.dark" }}>
                          {storeAdminFullAccess
                            ? "Covers every page, including ones added in future updates. Uncheck to choose page by page."
                            : "Set page by page below. Re-check to go back to covering every page automatically."}
                        </Typography>
                      </Stack>
                    ) : (
                      <>
                        <TextInput label="Name" value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} />
                        <TextInput label="Email" required value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
                        <TextInput label="Password" required={!editingUserId} type="password" value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} />
                      </>
                    )}
                    {editingStoreAdmin ? null : (
                      <>
                        <SelectInput
                          label="Role"
                          value={userForm.role}
                          onChange={handleRoleChange}
                          options={roles.map((item) => ({
                            value: item,
                            label: String(item).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
                          }))}
                        />
                        <SelectInput
                          label="Access Group (what they can do)"
                          value={userForm.accessGroupId}
                          onChange={(event) => setUserForm((prev) => ({ ...prev, accessGroupId: event.target.value }))}
                          options={[
                            { value: "", label: "No Group" },
                            ...accessGroupOptions,
                          ]}
                        />
                        {isSuperAdmin ? (
                          <SelectInput
                            label="Store Group (which stores)"
                            value={userForm.storeGroupId}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, storeGroupId: event.target.value }))}
                            options={[
                              { value: "", label: "— None —" },
                              ...storeGroupOptions,
                            ]}
                          />
                        ) : null}
                      </>
                    )}
                    <SelectInput
                      label="Status"
                      value={userForm.isActive}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, isActive: event.target.value }))}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                      ]}
                    />
                  </>
                ) : (
                  <TextInput label="Name" required value={groupForm.name} onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))} />
                )}
              </Stack>

              <Box sx={{ gridColumn: { xs: "span 12", lg: "span 8" }, minHeight: 0, borderColor: "divider", borderLeft: { lg: 1 }, pl: { lg: 2 } }}>
                <PermissionMatrix
                  permissions={
                    activeTab === "user"
                      ? (storeAdminFullAccess ? expandFullAccess() : displayedUserPermissions)
                      : groupForm.permissions
                  }
                  disabled={activeTab === "user" && (!!selectedAccessGroup || storeAdminFullAccess)}
                  entitlements={activeTab === "user" ? selectedStoreEntitlements : null}
                  onToggleAction={activeTab === "user" ? updateUserPermission : updateGroupPermission}
                  onToggleSectionAction={activeTab === "user" ? updateUserSectionPermission : updateGroupSectionPermission}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {isSuperAdmin ? (
        <StoreGroupsDrawer
          open={showStoreGroupsDrawer}
          onClose={() => setShowStoreGroupsDrawer(false)}
          groups={storeGroups}
          loading={loadingStoreGroups}
          saving={savingStoreGroup}
          storeOptions={storeGroupStoreOptions}
          onSave={handleSaveStoreGroup}
          onDelete={handleDeleteStoreGroup}
        />
      ) : null}
    </Box>
  );
};

export default UserAccess;
