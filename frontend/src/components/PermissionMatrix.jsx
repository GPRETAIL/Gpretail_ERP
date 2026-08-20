import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getPermissionCatalog,
  normalizePagePermissions,
  PERMISSION_ACTIONS,
} from "../utils/pagePermissionCatalog";
import { buildSectionActionState } from "../utils/permissionMatrixActions";

// Shared Page Access permission matrix. Extracted from settings/UserAccess so the
// same section/page × view/add/edit/delete grid can be reused by the owner/admin
// portal (Create Company module selection) and the tenant user-access editor.
// The pure state helpers live in utils/permissionMatrixActions.js so this file
// only exports a component (react-refresh/only-export-components).

const FragmentSection = ({
  section,
  permissions,
  paths,
  disabled,
  isExpanded,
  onToggleAction,
  onToggleExpanded,
  onToggleSectionAction,
}) => (
  <>
    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
      <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-100">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${section.name}`}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
          <span>{section.name}</span>
        </button>
      </td>
      {PERMISSION_ACTIONS.map((action) => {
        const state = buildSectionActionState(permissions, paths, action);
        return (
          <td key={`${section.name}-${action}`} className="px-3 py-2 text-center">
            <input
              type="checkbox"
              checked={state.checked}
              ref={(node) => {
                if (node) node.indeterminate = state.partial;
              }}
              disabled={disabled}
              onChange={(event) => onToggleSectionAction(section, action, event.target.checked)}
              className="h-4 w-4"
            />
          </td>
        );
      })}
    </tr>
    {isExpanded &&
      section.pages.map((page) => (
        <tr key={page.path} className="border-b border-gray-100 dark:border-gray-700">
          <td className="px-3 py-2 pl-9 text-gray-700 dark:text-gray-300">{page.name}</td>
          {PERMISSION_ACTIONS.map((action) => (
            <td key={`${page.path}-${action}`} className="px-3 py-2 text-center">
              <input
                type="checkbox"
                checked={!!permissions[page.path]?.[action]}
                disabled={disabled}
                onChange={(event) => onToggleAction(page.path, action, event.target.checked)}
                className="h-4 w-4"
              />
            </td>
          ))}
        </tr>
      ))}
  </>
);

// Filters the full page catalog down to the modules a store actually purchased. `entitlements` is the
// `{ sections: { <slug>: "all" | ["/page", ...] } }` shape; a null/absent value means unrestricted
// (show everything). A section is hidden when its slug is absent; "all" shows every page; a page list
// shows only the listed pages. Slug = section name lower-cased (Warehouse -> warehouse, CRM -> crm).
const applyEntitlementFilter = (catalog, entitlements) => {
  const sections = entitlements && typeof entitlements === "object" ? entitlements.sections : null;
  if (!sections || typeof sections !== "object") return catalog;
  const filtered = [];
  for (const section of catalog) {
    const grant = sections[section.name.toLowerCase()];
    if (grant === undefined || grant === null) continue;
    if (grant === "all") {
      filtered.push(section);
    } else if (Array.isArray(grant)) {
      const pages = section.pages.filter((page) => grant.includes(page.path));
      if (pages.length) filtered.push({ ...section, pages });
    }
  }
  return filtered;
};

const PermissionMatrix = ({ permissions, disabled = false, entitlements = null, onToggleAction, onToggleSectionAction }) => {
  const catalog = useMemo(() => applyEntitlementFilter(getPermissionCatalog(), entitlements), [entitlements]);
  const normalizedPermissions = normalizePagePermissions(permissions);
  const [expandedSections, setExpandedSections] = useState(() =>
    Object.fromEntries(catalog.map((section) => [section.name, false]))
  );

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = Object.fromEntries(catalog.map((section) => [section.name, prev[section.name] ?? false]));
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
        return prev;
      }
      return next;
    });
  }, [catalog]);

  const toggleSectionExpanded = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <div>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Page Access</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Select permissions by section and page.</p>
        </div>
        {disabled ? <span className="text-xs font-semibold text-amber-600">Using selected access group</span> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Pages</th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action} className="px-3 py-2 text-center font-semibold capitalize text-gray-700 dark:text-gray-300">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((section) => {
              const paths = section.pages.map((page) => page.path);
              return (
                <FragmentSection
                  key={section.name}
                  section={section}
                  permissions={normalizedPermissions}
                  paths={paths}
                  disabled={disabled}
                  isExpanded={!!expandedSections[section.name]}
                  onToggleAction={onToggleAction}
                  onToggleExpanded={() => toggleSectionExpanded(section.name)}
                  onToggleSectionAction={onToggleSectionAction}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionMatrix;
