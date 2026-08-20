import { normalizePagePermissions } from "./pagePermissionCatalog";

// Pure helpers for the Page Access permission matrix (section/page × view/add/edit/delete).
// Extracted from components/PermissionMatrix.jsx so that file only exports components —
// react-refresh/only-export-components: mixed exports break Vite Fast Refresh for the matrix.

export const hasAnyViewPermission = (permissions) =>
  Object.values(normalizePagePermissions(permissions)).some((entry) => entry?.view);

export const setPermissionAction = (permissions, path, action, checked) => {
  const next = { ...normalizePagePermissions(permissions) };
  const row = { view: false, add: false, edit: false, delete: false, ...(next[path] || {}) };
  row[action] = checked;
  if (!row.view && !row.add && !row.edit && !row.delete) {
    delete next[path];
  } else {
    next[path] = row;
  }
  return next;
};

export const setSectionAction = (permissions, paths, action, checked) => {
  let next = normalizePagePermissions(permissions);
  for (const path of paths) {
    next = setPermissionAction(next, path, action, checked);
  }
  return next;
};

export const buildSectionActionState = (permissions, paths, action) => {
  const normalized = normalizePagePermissions(permissions);
  const checkedCount = paths.filter((path) => normalized[path]?.[action]).length;
  return {
    checked: paths.length > 0 && checkedCount === paths.length,
    partial: checkedCount > 0 && checkedCount < paths.length,
  };
};
