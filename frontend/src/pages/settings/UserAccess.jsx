import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, Pencil, PlusCircle, Save, Search, Store, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import PermissionMatrix from "../../components/PermissionMatrix";
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
    try {
      setLoading(true);
      const res = await api.get("/user-access");
      setUsers(Array.isArray(res.data?.data?.users) ? res.data.data.users : []);
      setGroups(Array.isArray(res.data?.data?.groups) ? res.data.data.groups : []);
      setCompanies(Array.isArray(res.data?.meta?.companies) ? res.data.meta.companies : []);
      setRoles(
        Array.isArray(res.data?.meta?.roles) && res.data.meta.roles.length
          ? res.data.meta.roles
          : USER_ROLE_PRESET_OPTIONS.map((option) => option.value)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load user access");
    } finally {
      setLoading(false);
    }
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
        : row.company_id
          ? [String(row.company_id)]
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
    const ids =
      Array.isArray(row.company_ids) && row.company_ids.length
        ? row.company_ids.map((value) => String(value))
        : row.company_id
          ? [String(row.company_id)]
          : [];
    if (!ids.length) return row.company?.name || "--";
    const names = ids.map((id) => companyNameById.get(id) || row.company?.name || `Company ${id}`);
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
      <div className="p-4 md:p-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">User and Access</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="master-responsive flex h-full flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex items-center justify-between border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 shadow-sm">
        <div className="flex items-center space-x-2">
          <button onClick={handleBackClick} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100" type="button" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex items-center gap-1 text-sm font-semibold">
            <button type="button" onClick={() => navigate("/user-access")} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
              User Access
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>{entityTitle}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <button className="topbar-action-btn topbar-action-new" onClick={handleNew} type="button">
            <PlusCircle className="mr-1 h-4 w-4" /> New
          </button>
          <span>|</span>
          {!showSearchPage ? (
            <>
              <button
                type="button"
                className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
                onClick={activeTab === "user" ? handleSaveUser : handleSaveGroup}
                disabled={saving}
              >
                <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <span>|</span>
            </>
          ) : null}
          <button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={handleSearchClick}>
            <Search className="mr-1 h-4 w-4" /> Search
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4">
        {showSearchPage ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{listTitle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === "user" ? "Manage user accounts and assigned company access." : "Manage reusable page-access groups."}
                </p>
              </div>
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowStoreGroupsDrawer(true)}
                  className="glass-btn glass-btn-secondary flex items-center"
                  title="Group your stores together to assign store access in bulk"
                >
                  <Store className="mr-1 h-4 w-4" /> Store Groups (which stores)
                </button>
              ) : null}
            </div>

            <FilterableDataTable
              rows={activeTab === "user" ? users : groups}
              columns={activeTab === "user" ? userColumns : groupColumns}
              loading={loading}
              emptyText={activeTab === "user" ? "No users found." : "No groups found."}
              searchPlaceholder={activeTab === "user" ? "Search users..." : "Search groups..."}
              showExport={false}
              tablePreferenceKey={activeTab === "user" ? "user-access-users" : "user-access-groups"}
              renderActions={(row) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (activeTab === "user" ? handleEditUser(row) : handleEditGroup(row))}
                    className="glass-btn glass-btn-primary rounded p-1.5"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {activeTab === "user" && String(row.role || "").toLowerCase() === "admin" ? null : (
                    <button
                      type="button"
                      onClick={() => (activeTab === "user" ? handleDeleteUser(row) : handleDeleteGroup(row))}
                      className="glass-btn glass-btn-danger rounded p-1.5"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {activeTab === "user" && row.login_status === "logged_in" ? (
                    <button
                      type="button"
                      onClick={() => handleForceLogout(row)}
                      className="glass-btn glass-btn-secondary rounded p-1.5"
                      title="Logout"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              )}
              searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            />
          </div>
        ) : (
          <div className="h-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
            <div className="grid h-full min-h-0 grid-cols-12 gap-6">
              <div className="col-span-12 min-h-0 space-y-4 overflow-auto pr-4 lg:col-span-4">
                <h2 className="border-b dark:border-gray-700 pb-2 text-base font-bold text-gray-800 dark:text-gray-100">{activeTab === "user" ? (editingUserId ? "Edit User" : "Create User") : editingGroupId ? "Edit Group" : "Create Group"}</h2>

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
                          <p className="ml-[33%] rounded-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                            These stores don’t offer the same modules — the grid below shows only modules common to all of
                            them. To give different access per store, create a separate user for each store.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                        <div className="ml-3 flex-1 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 p-1.5 text-sm">{selectedCompanyName}</div>
                      </div>
                    )}

                    {editingStoreAdmin ? (
                      <div className="col-span-12 space-y-2 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/30 p-3">
                        <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                          Store admin — {userForm.name || userForm.email}
                        </p>
                        <p className="text-xs text-sky-800 dark:text-sky-200">
                          This account was created with its store, so its name, sign-in details and store
                          cannot be changed here. It is already limited to this store and to the modules the
                          store subscribes to — below you choose what it may do inside them.
                        </p>
                        <label className="flex items-center gap-2 pt-1 text-sm font-medium text-sky-900 dark:text-sky-100">
                          <input
                            type="checkbox"
                            checked={storeAdminFullAccess}
                            onChange={(event) => toggleStoreAdminFullAccess(event.target.checked)}
                          />
                          Full access to this store
                        </label>
                        <p className="text-xs text-sky-700 dark:text-sky-300">
                          {storeAdminFullAccess
                            ? "Covers every page, including ones added in future updates. Uncheck to choose page by page."
                            : "Set page by page below. Re-check to go back to covering every page automatically."}
                        </p>
                      </div>
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
              </div>

              <div className="col-span-12 min-h-0 border-gray-100 dark:border-gray-700 lg:col-span-8 lg:border-l lg:pl-4">
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
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default UserAccess;
