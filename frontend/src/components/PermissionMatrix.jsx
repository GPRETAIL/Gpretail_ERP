import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Box, ButtonBase, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
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
    <TableRow sx={{ bgcolor: "action.hover" }}>
      <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>
        <ButtonBase
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${section.name}`}
          sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1, justifyContent: "flex-start", textAlign: "left" }}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" style={{ color: "inherit", opacity: 0.7 }} /> : <ChevronRight className="h-4 w-4" style={{ color: "inherit", opacity: 0.7 }} />}
          <Box component="span">{section.name}</Box>
        </ButtonBase>
      </TableCell>
      {PERMISSION_ACTIONS.map((action) => {
        const state = buildSectionActionState(permissions, paths, action);
        return (
          <TableCell key={`${section.name}-${action}`} align="center">
            <Checkbox
              checked={state.checked}
              indeterminate={state.partial}
              disabled={disabled}
              onChange={(event) => onToggleSectionAction(section, action, event.target.checked)}
              size="small"
            />
          </TableCell>
        );
      })}
    </TableRow>
    {isExpanded &&
      section.pages.map((page) => (
        <TableRow key={page.path}>
          <TableCell sx={{ pl: 4.5, color: "text.secondary" }}>{page.name}</TableCell>
          {PERMISSION_ACTIONS.map((action) => (
            <TableCell key={`${page.path}-${action}`} align="center">
              <Checkbox
                checked={!!permissions[page.path]?.[action]}
                disabled={disabled}
                onChange={(event) => onToggleAction(page.path, action, event.target.checked)}
                size="small"
              />
            </TableCell>
          ))}
        </TableRow>
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
    <Box sx={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column", borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 1.5, py: 1 }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>Page Access</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Select permissions by section and page.</Typography>
        </Box>
        {disabled ? <Typography sx={{ fontSize: 12, fontWeight: 600, color: "warning.dark" }}>Using selected access group</Typography> : null}
      </Box>
      <Box sx={{ minHeight: 0, flex: 1, overflow: "auto" }}>
        <Table size="small" sx={{ width: "100%", minWidth: 760 }} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>Pages</TableCell>
              {PERMISSION_ACTIONS.map((action) => (
                <TableCell key={action} align="center" sx={{ fontWeight: 600, textTransform: "capitalize", color: "text.secondary" }}>
                  {action}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
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
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default PermissionMatrix;
