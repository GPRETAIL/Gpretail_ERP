// Lightweight cross-component "is there unsaved work right now" flag - a
// plain module-level variable rather than React state/context, since the
// only consumer (PwaUpdateBanner) just needs to read it once at the moment
// the user taps "Update Now", not re-render when it changes.
//
// Currently only CreateInvoiceScreen sets this (a non-empty cart is the
// dominant "unsaved work" case in this app - scanning several products in
// only to lose them to a reload would be the worst version of this bug).
let hasUnsavedWork = false;

export const setHasUnsavedWork = (value) => {
  hasUnsavedWork = Boolean(value);
};

export const getHasUnsavedWork = () => hasUnsavedWork;
