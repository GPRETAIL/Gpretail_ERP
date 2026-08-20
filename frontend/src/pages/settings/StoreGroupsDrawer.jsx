import { useEffect, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Store, Trash2, Pencil, X } from "lucide-react";
import { toast } from "react-toastify";
import FilterableDataTable from "../../components/FilterableDataTable";
import { TextInput, MultiSelectInput } from "./userAccessFormControls";

// Store Groups management drawer — a super-admin-only overlay on the User Access page.
//
// IMPORTANT: this is deliberately a different concept from the existing "Access Group"
// feature on this same page. Access Groups (see UserAccess.jsx) bundle page PERMISSIONS
// (what a user may do). Store Groups bundle STORES (which stores a user may work in). Both
// are labelled with their "(what/which ...)" suffix everywhere they appear so the two are
// never confused.
//
// The drawer is a controlled component: UserAccess.jsx owns the group list, loading/saving
// state and the API calls (loadStoreGroups/handleSaveStoreGroup/handleDeleteStoreGroup),
// mirroring how the rest of the page keeps its data-fetching in the parent. This component
// only owns which sub-view (list vs. create/edit form) is showing.
const createEmptyForm = () => ({ name: "", storeCompanyIds: [] });

const StoreGroupsDrawer = ({
  open,
  onClose,
  groups = [],
  loading = false,
  saving = false,
  storeOptions = [],
  onSave,
  onDelete,
}) => {
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);

  // Always land back on the list when the drawer is (re)opened.
  useEffect(() => {
    if (!open) return;
    setView("list");
    setEditingId(null);
    setForm(createEmptyForm());
  }, [open]);

  if (!open) return null;

  const handleNew = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setView("form");
  };

  const handleEdit = (group) => {
    setEditingId(group.id);
    setForm({
      name: group.name || "",
      storeCompanyIds: Array.isArray(group.storeCompanyIds) ? group.storeCompanyIds.map(String) : [],
    });
    setView("form");
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete store group ${group.name}?`)) return;
    await onDelete(group);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Store group name is required");
      return;
    }
    if (!form.storeCompanyIds.length) {
      toast.error("Select at least one store");
      return;
    }

    const ok = await onSave({ id: editingId, name: form.name, storeCompanyIds: form.storeCompanyIds });
    if (ok) {
      setView("list");
      setEditingId(null);
      setForm(createEmptyForm());
    }
  };

  const columns = [
    { key: "name", label: "Group Name" },
    {
      key: "storeNames",
      label: "Member Stores",
      render: (_, row) => (Array.isArray(row.storeNames) && row.storeNames.length ? row.storeNames.join(", ") : "--"),
      searchValue: (row) => (Array.isArray(row.storeNames) ? row.storeNames.join(", ") : ""),
    },
    {
      key: "storeCount",
      label: "Stores",
      render: (_, row) => (Array.isArray(row.storeCompanyIds) ? row.storeCompanyIds.length : 0),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white dark:bg-gray-800 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            {view === "form" ? (
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                aria-label="Back to store groups"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Store className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            )}
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {view === "list" ? "Store Groups (which stores)" : editingId ? "Edit Store Group" : "New Store Group"}
              </h2>
              {view === "list" ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Group your own stores together, then assign the group to a user so they can access every
                  store in it at once. This is separate from Access Groups, which control what a user can do.
                </p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {view === "list" ? (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleNew}
                  className="glass-btn glass-btn-primary flex items-center"
                >
                  <PlusCircle className="mr-1 h-4 w-4" /> New Store Group
                </button>
              </div>
              <FilterableDataTable
                rows={groups}
                columns={columns}
                loading={loading}
                emptyText="No store groups yet. Create one to assign multiple stores to a user at once."
                searchPlaceholder="Search store groups..."
                showExport={false}
                tablePreferenceKey="user-access-store-groups"
                renderActions={(row) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="glass-btn glass-btn-primary rounded p-1.5"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="glass-btn glass-btn-danger rounded p-1.5"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
              />
            </>
          ) : (
            <div className="space-y-4">
              <TextInput
                label="Name"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <MultiSelectInput
                label="Stores"
                required
                value={form.storeCompanyIds}
                onChange={(nextIds) => setForm((prev) => ({ ...prev, storeCompanyIds: nextIds }))}
                options={storeOptions}
                placeholder="Select stores"
                helperText="Pick one or more of your own stores to include in this group."
              />
            </div>
          )}
        </div>

        {view === "form" ? (
          <div className="flex justify-end gap-2 border-t dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40 px-4 py-3">
            <button
              type="button"
              onClick={() => setView("list")}
              className="glass-btn glass-btn-secondary px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="glass-btn glass-btn-success flex items-center px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StoreGroupsDrawer;
