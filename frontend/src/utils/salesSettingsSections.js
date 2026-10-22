// Existing store configuration keys remain unchanged during the editor migration.
export const SALES_BEHAVIOUR_KEYS = [
  "billNumberReset", "billNumberOverride", "settlementNumberReset", "settlementNumberOverride",
  "saleSaveAs", "posPaymentDialogVisible",
];

export const salesSettingsSectionPatch = (settings, section) => Object.fromEntries(
  Object.entries(settings).filter(([key]) => section === "sales"
    ? SALES_BEHAVIOUR_KEYS.includes(key)
    : !SALES_BEHAVIOUR_KEYS.includes(key))
);
