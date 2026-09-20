import { useEffect, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Store, Trash2, Pencil, X } from "lucide-react";
import { toast } from "react-toastify";
import { Box, Button, Drawer, IconButton, Stack, Typography } from "@mui/material";
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
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: "100%", maxWidth: 588, display: "flex", flexDirection: "column" } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {view === "form" ? (
            <IconButton size="small" onClick={() => setView("list")} sx={{ color: "text.secondary" }} aria-label="Back to store groups">
              <ArrowLeft size={16} />
            </IconButton>
          ) : (
            <Box sx={{ color: "text.secondary", display: "inline-flex" }}>
              <Store size={16} />
            </Box>
          )}
          <Box>
            <Typography component="h2" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
              {view === "list" ? "Store Groups (which stores)" : editingId ? "Edit Store Group" : "New Store Group"}
            </Typography>
            {view === "list" ? (
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                Group your own stores together, then assign the group to a user so they can access every
                store in it at once. This is separate from Access Groups, which control what a user can do.
              </Typography>
            ) : null}
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }} aria-label="Close">
          <X size={16} />
        </IconButton>
      </Stack>

      <Box sx={{ minHeight: 0, flex: 1, overflow: "auto", p: 2 }}>
        {view === "list" ? (
          <>
            <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="button"
                onClick={handleNew}
                className="glass-btn glass-btn-primary"
              >
                <PlusCircle size={16} style={{ marginRight: 4 }} /> New Store Group
              </Button>
            </Box>
            <FilterableDataTable
              rows={groups}
              columns={columns}
              loading={loading}
              emptyText="No store groups yet. Create one to assign multiple stores to a user at once."
              searchPlaceholder="Search store groups..."
              showExport={false}
              tablePreferenceKey="user-access-store-groups"
              renderActions={(row) => (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="glass-btn glass-btn-primary"
                    title="Edit"
                    sx={{ minWidth: "auto" }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="glass-btn glass-btn-danger"
                    title="Delete"
                    sx={{ minWidth: "auto" }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Stack>
              )}
              searchButtonClassName="glass-btn glass-btn-primary"
            />
          </>
        ) : (
          <Stack spacing={2}>
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
          </Stack>
        )}
      </Box>

      {view === "form" ? (
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button
            type="button"
            onClick={() => setView("list")}
            className="glass-btn glass-btn-secondary"
            sx={{ fontSize: 12.25 }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="glass-btn glass-btn-success"
            sx={{ fontSize: 12.25 }}
          >
            <Save size={16} style={{ marginRight: 4 }} /> {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      ) : null}
    </Drawer>
  );
};

export default StoreGroupsDrawer;
