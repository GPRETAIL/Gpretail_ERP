import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Card,
  Chip,
  Slider,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import api from "../../api/axios";
import checkAuth from "../../utils/checkAuth";
import { useTheme as useAppTheme } from "../../features/theme-context";
import { createTenantTheme, DEFAULT_BRAND, isHexColor } from "../../theme/themeRegistry";

const fieldLabelSx = { fontSize: 11, fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" };

// `brand` (from `/auth/me`, Redux `state.auth.user.brand`) is already snake_case on the wire --
// SanitizedUserResponse.BrandSummary's @JsonProperty annotations serialize primary_color/
// secondary_color/border_radius, same keys createTenantTheme expects, confirmed by
// TenantThemeProvider.test.jsx's own brand fixtures. The form below uses camelCase locally (JS
// convention) but reads/writes those exact wire keys. Falls back per-field the same way
// createTenantTheme does, so the form never shows a value the live theme itself wouldn't accept.
const toFormState = (brand) => ({
  primaryColor: isHexColor(brand?.primary_color) ? brand.primary_color : DEFAULT_BRAND.primary_color,
  secondaryColor: isHexColor(brand?.secondary_color) ? brand.secondary_color : DEFAULT_BRAND.secondary_color,
  borderRadius: Number.isFinite(brand?.border_radius) ? brand.border_radius : DEFAULT_BRAND.border_radius,
});

const BrandPreviewCard = () => (
  <Card variant="outlined" sx={{ p: 3 }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Preview</Typography>
    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2.5 }}>
      How your brand colors look on real controls.
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

const Branding = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const { theme: mode } = useAppTheme();
  const companyId = authUser?.company_id;

  const savedForm = useMemo(() => toFormState(authUser?.brand), [authUser?.brand]);
  const [form, setForm] = useState(savedForm);
  const [saving, setSaving] = useState(false);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  const primaryValid = isHexColor(form.primaryColor);
  const secondaryValid = isHexColor(form.secondaryColor);
  const radiusValid = Number.isFinite(form.borderRadius);

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
        },
        mode
      ),
    [form, mode]
  );

  const handleColorChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
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

  const handleSave = () => {
    if (!primaryValid || !secondaryValid || !radiusValid) {
      toast.warn("Enter valid brand colors before saving");
      return;
    }
    persistTheme(
      {
        primary_color: form.primaryColor,
        secondary_color: form.secondaryColor,
        border_radius: form.borderRadius,
      },
      "Branding saved"
    );
  };

  const handleResetToDefault = () => {
    const confirmed = window.confirm("Reset brand colors to the default? This clears your custom branding.");
    if (!confirmed) return;
    // Empty theme object -- CompanyFormMapper.parseTheme treats "no keys present" as clearing the
    // stored override, so DEFAULT_BRAND applies again via createTenantTheme's own fallback.
    persistTheme({}, "Branding reset to default");
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
                  <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Brand Colors</Typography>
                  <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5, maxWidth: 480 }}>
                    Set your company&apos;s primary and secondary colors and corner roundness. Changes apply across
                    the whole app once saved.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RotateCcw className="h-4 w-4" />}
                    onClick={handleResetToDefault}
                    disabled={saving}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save className="h-4 w-4" />}
                    onClick={handleSave}
                    disabled={saving || !primaryValid || !secondaryValid || !radiusValid}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </Stack>
              </Stack>
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
            <BrandPreviewCard />
          </ThemeProvider>
        </Box>
      </Box>
    </Box>
  );
};

export default Branding;
