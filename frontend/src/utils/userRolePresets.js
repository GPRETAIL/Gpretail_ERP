import { getPermissionCatalog, normalizePagePermissions } from "./pagePermissionCatalog";

export const USER_ROLE_PRESET_KEY_PREFIX = "preset_role:";

export const USER_ROLE_PRESET_OPTIONS = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "accountant", label: "Accountant" },
  { value: "warehouse_user", label: "Warehouse User" },
  { value: "store_user", label: "Store User" },
];

const EMPTY_ACTIONS = { view: false, add: false, edit: false, delete: false };
const VIEW_ONLY_ACTIONS = { view: true };
const OPERATE_ACTIONS = { view: true, add: true, edit: true };
const FULL_ACTIONS = { view: true, add: true, edit: true, delete: true };

const normalizePresetRole = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return USER_ROLE_PRESET_OPTIONS.some((option) => option.value === normalized) ? normalized : "user";
};

const createCatalogLookup = () => {
  const sections = new Map();
  const pages = new Map();

  for (const section of getPermissionCatalog()) {
    sections.set(
      String(section.name || "").trim().toLowerCase(),
      (section.pages || []).map((page) => page.path)
    );

    for (const page of section.pages || []) {
      const key = `${String(section.name || "").trim().toLowerCase()}::${String(page.name || "").trim().toLowerCase()}`;
      pages.set(key, page.path);
    }
  }

  return {
    getSectionPaths: (sectionName) => sections.get(String(sectionName || "").trim().toLowerCase()) || [],
    getPagePath: (sectionName, pageName) =>
      pages.get(`${String(sectionName || "").trim().toLowerCase()}::${String(pageName || "").trim().toLowerCase()}`) || "",
  };
};

const setActionsForPath = (draft, path, actions) => {
  if (!path) return;
  draft[path] = { ...EMPTY_ACTIONS, ...(draft[path] || {}), ...actions };
};

const setActionsForPaths = (draft, paths, actions) => {
  for (const path of paths) {
    setActionsForPath(draft, path, actions);
  }
};

const buildPresetPermissions = (presetRole) => {
  const role = normalizePresetRole(presetRole);
  if (role === "user") {
    return {};
  }

  const { getSectionPaths, getPagePath } = createCatalogLookup();
  const permissions = {};

  const warehousePaths = getSectionPaths("Warehouse");
  const crmPaths = getSectionPaths("CRM");
  const salesPaths = getSectionPaths("Sales");
  const financePaths = getSectionPaths("Finance");
  const storePaths = getSectionPaths("Store");

  const hrPaths = [
    getPagePath("Masters", "Employee"),
    getPagePath("Masters", "Employee In/Out"),
    getPagePath("Masters", "HR Configuration"),
    getPagePath("Masters", "Salary Management"),
  ].filter(Boolean);

  const financeReportPaths = [
    getPagePath("Finance", "Daybook"),
    getPagePath("Finance", "Payable"),
    getPagePath("Finance", "Receivable"),
    getPagePath("Finance", "Trial Balance"),
    getPagePath("Finance", "Trading Account"),
    getPagePath("Finance", "Profit & Loss Account"),
    getPagePath("Finance", "Balance Sheet"),
    getPagePath("Finance", "Incentive Report"),
  ].filter(Boolean);

  switch (role) {
    case "manager":
      setActionsForPaths(permissions, warehousePaths, OPERATE_ACTIONS);
      setActionsForPaths(permissions, crmPaths, FULL_ACTIONS);
      setActionsForPaths(permissions, salesPaths, FULL_ACTIONS);
      setActionsForPaths(permissions, hrPaths, VIEW_ONLY_ACTIONS);
      setActionsForPaths(permissions, financeReportPaths, VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("Masters", "Product"), FULL_ACTIONS);
      break;

    case "cashier":
      setActionsForPath(permissions, getPagePath("Sales", "POS Sales"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("Sales", "POS Sales Return"), { view: true, add: true });
      setActionsForPath(permissions, getPagePath("Sales", "Cash Opening"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("Sales", "Cash Closing"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("Sales", "Settlement"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("CRM", "Bill Print"), VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("CRM", "Customer"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("CRM", "Loyalty Management"), VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("CRM", "Gift Voucher"), VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("CRM", "Gift Coupon"), VIEW_ONLY_ACTIONS);
      break;

    case "accountant":
      setActionsForPaths(permissions, financePaths, FULL_ACTIONS);
      setActionsForPaths(permissions, salesPaths, VIEW_ONLY_ACTIONS);
      setActionsForPaths(permissions, warehousePaths, VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("Masters", "Salary Management"), FULL_ACTIONS);
      setActionsForPath(permissions, getPagePath("Settings", "Printing Configuration"), VIEW_ONLY_ACTIONS);
      break;

    case "warehouse_user":
      setActionsForPaths(permissions, warehousePaths, FULL_ACTIONS);
      setActionsForPath(permissions, getPagePath("Store", "Stock Inward"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("Store", "Transfer Goods"), OPERATE_ACTIONS);
      setActionsForPath(permissions, getPagePath("Masters", "Product"), VIEW_ONLY_ACTIONS);
      setActionsForPath(permissions, getPagePath("Sales", "Delivery"), OPERATE_ACTIONS);
      break;

    case "store_user":
      setActionsForPaths(permissions, storePaths, FULL_ACTIONS);
      setActionsForPath(permissions, getPagePath("Warehouse", "Physical Stock"), VIEW_ONLY_ACTIONS);
      break;

    default:
      break;
  }

  return normalizePagePermissions(permissions);
};

export const getUserRolePresetPermissions = (presetRole) => buildPresetPermissions(presetRole);

export const extractUserRolePreset = (accessRoles) => {
  const marker = Array.isArray(accessRoles)
    ? accessRoles.find((entry) => String(entry || "").trim().toLowerCase().startsWith(USER_ROLE_PRESET_KEY_PREFIX))
    : "";

  if (!marker) return "user";
  return normalizePresetRole(String(marker).slice(USER_ROLE_PRESET_KEY_PREFIX.length));
};
