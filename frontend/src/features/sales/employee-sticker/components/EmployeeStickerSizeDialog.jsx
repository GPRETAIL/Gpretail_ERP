import { useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import {
  EMPLOYEE_STICKER_LIMITS, EMPLOYEE_STICKER_PRESETS, effectiveEmployeeStickerSize, employeeStickerPayload, formatEmployeeStickerSize,
} from "@/features/sales/employee-sticker/utils/employeeStickerSize";

/**
 * Sales > Employee Sticker > Sticker size. One size for this store's employee stickers, saved in Sales Customisation.
 * "Use product sticker size" clears it, so employee stickers follow Warehouse > Barcode Customisation again.
 * saved: the stored size or null. product: the product label settings (the starting values).
 */
export default function EmployeeStickerSizeDialog({ open, onClose, saved, product, storeId, onSaved }) {
  const [form, setForm] = useState(() => effectiveEmployeeStickerSize(saved, product));
  const [saving, setSaving] = useState(false);

  const save = async (value) => {
    setSaving(true);
    try {
      const res = await api.put("/sales-customization", { companyId: storeId, settingsSection: "sales", employeeSticker: value });
      toast.success(value ? "Sticker size saved." : "Employee stickers use the product sticker size.");
      onSaved(res.data?.data?.employeeSticker ?? null);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the sticker size.");
    } finally {
      setSaving(false);
    }
  };

  const payload = employeeStickerPayload(form);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="employee-sticker-size-title">
      <DialogTitle id="employee-sticker-size-title">Employee sticker size</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Applies to employee stickers only, for this store. The printer, margins, font and print mode still come from Warehouse &gt; Barcode Customisation.
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary">Common sizes</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
              {EMPLOYEE_STICKER_PRESETS.map((preset) => {
                const label = formatEmployeeStickerSize({ labelWidthMm: preset.width, labelHeightMm: preset.height });
                const active = Number(form.labelWidthMm) === preset.width && Number(form.labelHeightMm) === preset.height;
                return <Chip key={label} label={label} clickable color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
                  onClick={() => setForm((current) => ({ ...current, labelWidthMm: preset.width, labelHeightMm: preset.height }))} />;
              })}
            </Stack>
          </Box>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" } }}>
            {Object.entries(EMPLOYEE_STICKER_LIMITS).map(([key, limit]) => (
              <TextField key={key} size="small" type="number" label={limit.label} value={form[key]} onChange={set(key)}
                slotProps={{ htmlInput: { min: limit.min, max: limit.max, step: limit.step } }} />
            ))}
          </Box>
          {!payload && <Typography variant="body2" color="error">Enter a number in every box.</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Button color="inherit" disabled={saving || !saved} onClick={() => void save(null)}>Use product sticker size</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" disabled={saving || !payload} onClick={() => void save(payload)}>{saving ? "Saving..." : "Save size"}</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
