import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RotateCcw, Save, Square, Apple, Droplets, Check, X, Type, Bookmark, Trash2, PlusCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import api from "../../api/axios";
import checkAuth from "../../utils/checkAuth";
import { useTheme as useAppTheme } from "../../features/theme-context";
import {
  createTenantTheme,
  DEFAULT_BRAND,
  DEFAULT_FONT,
  DEFAULT_THEME_STYLE,
  ensureGoogleFontLoaded,
  FONT_OPTIONS,
  getFontOption,
  isHexColor,
} from "../../theme/themeRegistry";

const fieldLabelSx = { fontSize: 11, fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" };

// <input type="color"> only accepts #rrggbb -- MUI's own default text.primary is an rgba() string
// ("rgba(0, 0, 0, 0.87)"), which the browser would silently reject. Every other resolved default
// this page reads for a swatch (background.default, success/warning/error.main) already happens
// to be a plain hex, but this keeps the swatch safe regardless of what a future MUI version (or a
// theme_style override) resolves a token to.
const toSwatchHex = (value, mode) => (isHexColor(value) ? value : mode === "dark" ? "#ffffff" : "#000000");

// Style is a separate axis from color (below) -- every style still renders in whichever
// primary/secondary the tenant picked. See STYLE_COMPONENTS in themeRegistry.js for what each
// one actually changes (shadow/border/blur on Card, Paper, AppBar, Dialog, Menu) and
// themeStyles.css for the same treatment mirrored onto the Tailwind-styled dashboard cards.
const THEME_STYLE_OPTIONS = [
  { id: "classic", label: "Classic", description: "Flat cards, solid surfaces -- today's default look.", icon: Square },
  { id: "apple", label: "Apple", description: "Soft shadows, fully rounded buttons, minimal borders.", icon: Apple },
  { id: "glass", label: "Liquid Glass", description: "Translucent, blurred surfaces with a subtle glow.", icon: Droplets },
];

// Optional on top of primary/secondary -- unset (empty string in the form) means "use the app's
// own default for this token", not "fall back to a DEFAULT_BRAND value" the way primary/secondary
// do below, since these have no single sensible brand-wide default to fall back to. field is the
// camelCase form key; wire is the snake_case key the API/createTenantTheme expects; palette is
// where that same token lives on a resolved MUI theme (theme.palette[paletteGroup][paletteToken]),
// used only to give the color swatch a sensible value to show while the field itself is blank --
// an <input type="color"> can't render a true "unset" state.
const ADVANCED_COLOR_FIELDS = [
  { field: "backgroundColor", wire: "background_color", paletteGroup: "background", paletteToken: "default", label: "Background", helper: "Page background behind cards" },
  { field: "textColor", wire: "text_color", paletteGroup: "text", paletteToken: "primary", label: "Text", helper: "Default body text color" },
  { field: "successColor", wire: "success_color", paletteGroup: "success", paletteToken: "main", label: "Success", helper: "Paid / completed / in-stock states" },
  { field: "warningColor", wire: "warning_color", paletteGroup: "warning", paletteToken: "main", label: "Warning", helper: "Due soon / low stock states" },
  { field: "errorColor", wire: "error_color", paletteGroup: "error", paletteToken: "main", label: "Error", helper: "Overdue / failed / out-of-stock states" },
];

// `brand` (from `/auth/me`, Redux `state.auth.user.brand`) is already snake_case on the wire --
// same keys createTenantTheme expects, confirmed by TenantThemeProvider.test.jsx's own brand
// fixtures. The form below uses camelCase locally (JS convention) but reads/writes those exact
// wire keys. Falls back per-field the same way createTenantTheme does, so the form never shows a
// value the live theme itself wouldn't accept.
const toFormState = (brand) => ({
  primaryColor: isHexColor(brand?.primary_color) ? brand.primary_color : DEFAULT_BRAND.primary_color,
  secondaryColor: isHexColor(brand?.secondary_color) ? brand.secondary_color : DEFAULT_BRAND.secondary_color,
  borderRadius: Number.isFinite(brand?.border_radius) ? brand.border_radius : DEFAULT_BRAND.border_radius,
  themeStyle: THEME_STYLE_OPTIONS.some((opt) => opt.id === brand?.theme_style) ? brand.theme_style : DEFAULT_THEME_STYLE,
  fontFamily: FONT_OPTIONS.some((opt) => opt.id === brand?.font_family) ? brand.font_family : DEFAULT_FONT,
  ...Object.fromEntries(
    ADVANCED_COLOR_FIELDS.map(({ field, wire }) => [field, isHexColor(brand?.[wire]) ? brand[wire] : ""])
  ),
});

const BrandPreviewCard = ({ fontStack }) => (
  <Card variant="outlined" sx={{ p: 3, fontFamily: fontStack }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Preview</Typography>
    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2.5 }}>
      How your brand colors, style, and font look on real controls.
    </Typography>
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
        <Button variant="contained" color="primary">Primary action</Button>
        <Button variant="outlined" color="secondary">Secondary action</Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Chip label="Primary" color="primary" />
        <Chip label="Secondary" color="secondary" />
      </Stack>
    </Stack>
  </Card>
);

const Themes = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const { theme: mode } = useAppTheme();
  const companyId = authUser?.company_id;

  const savedForm = useMemo(() => toFormState(authUser?.brand), [authUser?.brand]);
  const [form, setForm] = useState(savedForm);
  const [saving, setSaving] = useState(false);

  // Preloads every Google Fonts option (a small, fixed set of 4) so the picker below can render
  // each option's own name in its own typeface, not just apply whichever one ends up selected.
  useEffect(() => {
    FONT_OPTIONS.forEach((option) => ensureGoogleFontLoaded(option.google));
  }, []);

  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetBusyId, setPresetBusyId] = useState(null); // preset.id mid apply/delete, or "saving" while the dialog's save is in flight
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const loadPresets = useCallback(async () => {
    if (!companyId) return;
    setPresetsLoading(true);
    try {
      const res = await api.get(`/companies/${companyId}/theme-presets`);
      setPresets(res.data?.data || []);
    } catch {
      // Non-critical: the rest of the page works fully without a presets list.
    } finally {
      setPresetsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  const primaryValid = isHexColor(form.primaryColor);
  const secondaryValid = isHexColor(form.secondaryColor);
  const radiusValid = Number.isFinite(form.borderRadius);
  // Advanced tokens are optional -- empty (unset) is valid, same as leaving them out entirely;
  // only a non-empty value that isn't a real hex color blocks Save.
  const advancedFieldsValid = ADVANCED_COLOR_FIELDS.every(
    ({ field }) => form[field] === "" || isHexColor(form[field])
  );

  // Fed the raw, possibly mid-typing form values on purpose -- createTenantTheme's own fallback
  // (see themeRegistry.js) already degrades gracefully on an invalid/partial value, so the preview
  // never breaks while the admin is typing; only the Save button gates on full validity.
  const previewTheme = useMemo(
    () =>
      createTenantTheme(
        {
          primary_color: form.primaryColor,
          secondary_color: form.secondaryColor,
          border_radius: form.borderRadius,
          theme_style: form.themeStyle,
          ...Object.fromEntries(ADVANCED_COLOR_FIELDS.map(({ field, wire }) => [wire, form[field]])),
        },
        mode
      ),
    [form, mode]
  );

  const handleColorChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClearAdvancedColor = (field) => () => {
    setForm((prev) => ({ ...prev, [field]: "" }));
  };

  const handleStyleSelect = (styleId) => {
    setForm((prev) => ({ ...prev, themeStyle: styleId }));
  };

  const handleFontSelect = (fontId) => {
    // Speculatively loads the font as soon as it's picked, not only after Save, so the Preview
    // card below can actually render it live -- TenantThemeProvider only reacts to the saved
    // brand, not this in-progress form state.
    ensureGoogleFontLoaded(getFontOption(fontId).google);
    setForm((prev) => ({ ...prev, fontFamily: fontId }));
  };

  const handleRadiusSliderChange = (_event, value) => {
    setForm((prev) => ({ ...prev, borderRadius: Array.isArray(value) ? value[0] : value }));
  };

  const handleRadiusInputChange = (e) => {
    const value = Number(e.target.value);
    setForm((prev) => ({ ...prev, borderRadius: Number.isFinite(value) ? value : prev.borderRadius }));
  };

  const persistTheme = async (themePayload, successMessage) => {
    if (!companyId) {
      toast.error("No company found for this account");
      return;
    }
    setSaving(true);
    try {
      // A dedicated theme-only endpoint, not the general multipart PUT /companies/{id} -- that one
      // requires an admin email (from the body or an existing admin-role user row) because it's
      // shared with company creation, which a branding-only save has no reason to satisfy.
      await api.put(`/companies/${companyId}/theme`, themePayload);
      // Refreshes state.auth.user (including .brand) app-wide, so TenantThemeProvider re-themes
      // every page immediately -- not just this preview pane. Same mechanism AuthInitializer uses.
      await checkAuth(dispatch);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  // Shared by the regular Save below and "Save as preset" -- both persist the exact same shape,
  // just to a different endpoint (the active theme vs. a new named snapshot of it).
  const buildThemePayload = () => ({
    primary_color: form.primaryColor,
    secondary_color: form.secondaryColor,
    border_radius: form.borderRadius,
    theme_style: form.themeStyle,
    font_family: form.fontFamily,
    // An advanced token left empty is sent as null (explicitly unset), not "" -- the backend's
    // nullable+regex validation rule rejects a bare "" as neither a real hex nor a clean skip.
    ...Object.fromEntries(ADVANCED_COLOR_FIELDS.map(({ field, wire }) => [wire, form[field] || null])),
  });

  const fieldsValid = primaryValid && secondaryValid && radiusValid && advancedFieldsValid;

  const handleSave = () => {
    if (!primaryValid || !secondaryValid || !radiusValid) {
      toast.warn("Enter valid brand colors before saving");
      return;
    }
    if (!advancedFieldsValid) {
      toast.warn("Enter a valid hex color for each advanced color you've set, or clear it");
      return;
    }
    persistTheme(buildThemePayload(), "Theme saved");
  };

  const handleResetToDefault = () => {
    const confirmed = window.confirm("Reset the theme to default? This clears your custom style and colors.");
    if (!confirmed) return;
    // Empty theme object -- the backend treats "no keys present" as clearing the stored override,
    // so DEFAULT_BRAND/DEFAULT_THEME_STYLE apply again via createTenantTheme's own fallback.
    persistTheme({}, "Theme reset to default");
  };

  const handleOpenSaveDialog = () => {
    if (!fieldsValid) {
      toast.warn("Fix the invalid fields above before saving a preset");
      return;
    }
    setPresetName("");
    setSaveDialogOpen(true);
  };

  const handleSaveAsPreset = async () => {
    const name = presetName.trim();
    if (!name) {
      toast.warn("Enter a name for this preset");
      return;
    }
    if (!companyId) return;
    setPresetBusyId("saving");
    try {
      await api.post(`/companies/${companyId}/theme-presets`, { name, ...buildThemePayload() });
      toast.success(`Saved "${name}"`);
      setSaveDialogOpen(false);
      await loadPresets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save preset");
    } finally {
      setPresetBusyId(null);
    }
  };

  const handleApplyPreset = async (preset) => {
    if (!companyId) return;
    setPresetBusyId(preset.id);
    try {
      await api.post(`/companies/${companyId}/theme-presets/${preset.id}/apply`);
      // checkAuth refreshes state.auth.user.brand app-wide (re-theming every page via
      // TenantThemeProvider), but this page's own form state was set once from the previous
      // brand on mount and never auto-resyncs -- without this, the color/style/font pickers on
      // this exact page would keep showing the pre-apply values until a manual reload.
      setForm(toFormState(preset.config));
      await checkAuth(dispatch);
      toast.success(`Applied "${preset.name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply preset");
    } finally {
      setPresetBusyId(null);
    }
  };

  const handleDeletePreset = async (preset) => {
    const confirmed = window.confirm(`Delete the "${preset.name}" preset? This can't be undone.`);
    if (!confirmed || !companyId) return;
    setPresetBusyId(preset.id);
    try {
      await api.delete(`/companies/${companyId}/theme-presets/${preset.id}`);
      toast.success(`Deleted "${preset.name}"`);
      await loadPresets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete preset");
    } finally {
      setPresetBusyId(null);
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "hidden", bgcolor: "background.default", p: { xs: 1.5, sm: 2 } }}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          height: "100%",
          gridTemplateColumns: { xl: "minmax(0, 1fr) 380px" },
          overflow: "hidden",
        }}
      >
        <Box sx={{ minHeight: 0, overflowY: "auto", pr: 0.5 }}>
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
              >
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Themes</Typography>
                  <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5, maxWidth: 480 }}>
                    Pick a theme style and set your company&apos;s colors and corner roundness. Changes apply
                    across the whole app once saved.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RotateCcw size={16} />}
                    onClick={handleResetToDefault}
                    disabled={saving}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save size={16} />}
                    onClick={handleSave}
                    disabled={saving || !primaryValid || !secondaryValid || !radiusValid || !advancedFieldsValid}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </Stack>
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Theme Style</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
                How cards and surfaces look, independent of your colors below.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                }}
              >
                {THEME_STYLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = form.themeStyle === option.id;
                  return (
                    <Box
                      key={option.id}
                      component="button"
                      type="button"
                      onClick={() => handleStyleSelect(option.id)}
                      aria-pressed={selected}
                      sx={{
                        textAlign: "left",
                        cursor: "pointer",
                        borderRadius: 2,
                        border: "2px solid",
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.selected" : "background.paper",
                        p: 1.75,
                        font: "inherit",
                        color: "inherit",
                        transition: "border-color 0.15s ease, background-color 0.15s ease",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Icon style={{ width: 16, height: 16 }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{option.label}</Typography>
                        </Stack>
                        {selected && <Check size={16} aria-label="Selected" />}
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.75 }}>
                        {option.description}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Type size={16} />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Font</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
                Applies app-wide, independent of color and style.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
                }}
              >
                {FONT_OPTIONS.map((option) => {
                  const selected = form.fontFamily === option.id;
                  return (
                    <Box
                      key={option.id}
                      component="button"
                      type="button"
                      onClick={() => handleFontSelect(option.id)}
                      aria-pressed={selected}
                      sx={{
                        textAlign: "left",
                        cursor: "pointer",
                        borderRadius: 2,
                        border: "2px solid",
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.selected" : "background.paper",
                        p: 1.75,
                        color: "inherit",
                        transition: "border-color 0.15s ease, background-color 0.15s ease",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 600, fontFamily: option.stack }}>
                          {option.label}
                        </Typography>
                        {selected && <Check size={16} aria-label="Selected" />}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography sx={fieldLabelSx}>Primary Color</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      component="input"
                      type="color"
                      aria-label="Primary color swatch"
                      value={primaryValid ? form.primaryColor : DEFAULT_BRAND.primary_color}
                      onChange={handleColorChange("primaryColor")}
                      sx={{
                        width: 44, height: 40, p: 0, border: "1px solid", borderColor: "divider",
                        borderRadius: 1, cursor: "pointer", bgcolor: "transparent",
                      }}
                    />
                    <TextField
                      size="small"
                      label="Primary color hex"
                      value={form.primaryColor}
                      onChange={handleColorChange("primaryColor")}
                      error={!primaryValid}
                      helperText={primaryValid ? "e.g. #3a6ea5" : "Enter a valid hex color (#rgb or #rrggbb)"}
                      sx={{ maxWidth: 220 }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography sx={fieldLabelSx}>Secondary Color</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      component="input"
                      type="color"
                      aria-label="Secondary color swatch"
                      value={secondaryValid ? form.secondaryColor : DEFAULT_BRAND.secondary_color}
                      onChange={handleColorChange("secondaryColor")}
                      sx={{
                        width: 44, height: 40, p: 0, border: "1px solid", borderColor: "divider",
                        borderRadius: 1, cursor: "pointer", bgcolor: "transparent",
                      }}
                    />
                    <TextField
                      size="small"
                      label="Secondary color hex"
                      value={form.secondaryColor}
                      onChange={handleColorChange("secondaryColor")}
                      error={!secondaryValid}
                      helperText={secondaryValid ? "e.g. #10b981" : "Enter a valid hex color (#rgb or #rrggbb)"}
                      sx={{ maxWidth: 220 }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography sx={fieldLabelSx}>Corner Radius</Typography>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Slider
                      value={radiusValid ? form.borderRadius : DEFAULT_BRAND.border_radius}
                      onChange={handleRadiusSliderChange}
                      min={0}
                      max={32}
                      step={1}
                      aria-label="Corner radius slider"
                      sx={{ maxWidth: 280 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Corner radius value"
                      value={form.borderRadius}
                      onChange={handleRadiusInputChange}
                      slotProps={{ htmlInput: { min: 0, max: 32, step: 1 } }}
                      sx={{ width: 90 }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Advanced Colors</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
                Optional -- leave a token blank to keep the app's own default for it.
              </Typography>
              <Stack spacing={2.5}>
                {ADVANCED_COLOR_FIELDS.map(({ field, paletteGroup, paletteToken, label, helper }) => {
                  const value = form[field];
                  const valid = value === "" || isHexColor(value);
                  const resolvedValue = isHexColor(value)
                    ? value
                    : toSwatchHex(previewTheme.palette[paletteGroup][paletteToken], mode);
                  return (
                    <Box key={field}>
                      <Typography sx={fieldLabelSx}>{label}</Typography>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                          component="input"
                          type="color"
                          aria-label={`${label} color swatch`}
                          value={resolvedValue}
                          onChange={handleColorChange(field)}
                          sx={{
                            width: 44, height: 40, p: 0, border: "1px solid", borderColor: "divider",
                            borderRadius: 1, cursor: "pointer", bgcolor: "transparent",
                          }}
                        />
                        <TextField
                          size="small"
                          label={`${label} color hex`}
                          placeholder="Not set"
                          value={value}
                          onChange={handleColorChange(field)}
                          error={!valid}
                          helperText={valid ? helper : "Enter a valid hex color (#rgb or #rrggbb), or clear it"}
                          sx={{ maxWidth: 220 }}
                        />
                        {value !== "" && (
                          <Button
                            size="small"
                            color="inherit"
                            startIcon={<X size={14} />}
                            onClick={handleClearAdvancedColor(field)}
                            sx={{ color: "text.secondary" }}
                          >
                            Clear
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                    <Bookmark size={16} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Saved Presets</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    Save the whole look above -- colors, style, and font -- under a name, and switch back to it anytime.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlusCircle size={14} />}
                  onClick={handleOpenSaveDialog}
                  disabled={presetBusyId !== null}
                >
                  Save Current
                </Button>
              </Stack>

              {presetsLoading ? (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Loading presets...</Typography>
              ) : presets.length === 0 ? (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  No saved presets yet -- adjust colors/style/font above and use "Save Current" to keep one.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {presets.map((preset) => {
                    const swatch = isHexColor(preset.config?.primary_color) ? preset.config.primary_color : "#94a3b8";
                    const busy = presetBusyId === preset.id;
                    return (
                      <Stack
                        key={preset.id}
                        direction="row"
                        spacing={1.5}
                        sx={{
                          alignItems: "center", justifyContent: "space-between",
                          border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1,
                        }}
                      >
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                          <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: swatch, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                            {preset.name}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            onClick={() => handleApplyPreset(preset)}
                            disabled={presetBusyId !== null}
                          >
                            {busy ? "..." : "Apply"}
                          </Button>
                          <IconButton
                            size="small"
                            aria-label={`Delete ${preset.name}`}
                            onClick={() => handleDeletePreset(preset)}
                            disabled={presetBusyId !== null}
                            sx={{ color: "text.secondary" }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Card>

            {hasUnsavedChanges && (
              <Box
                sx={{
                  borderRadius: 1, border: "1px solid", borderColor: "warning.main",
                  bgcolor: "warning.light", px: 2, py: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 13, color: "warning.dark" }}>
                  You have unsaved branding changes.
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        <Box sx={{ minHeight: 0 }}>
          <ThemeProvider theme={previewTheme}>
            <BrandPreviewCard fontStack={getFontOption(form.fontFamily).stack} />
          </ThemeProvider>
        </Box>
      </Box>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Current Theme As...</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Preset name"
            placeholder="e.g. Diwali Sale"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveAsPreset();
            }}
            slotProps={{ htmlInput: { maxLength: 60 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={presetBusyId === "saving"}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveAsPreset} disabled={presetBusyId === "saving"}>
            {presetBusyId === "saving" ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Themes;
