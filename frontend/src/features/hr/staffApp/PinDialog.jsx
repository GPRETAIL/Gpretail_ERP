import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import { post } from "../utils/hrApi";
import { TYPE } from "@/shared/theme/typeScale";
import { staffAppUrl, suggestPin } from "./staffAppPin";

/** Switch on the staff app for an employee (or reset their PIN) with a starting PIN they change at first sign-in. */
export default function PinDialog({ employee, onClose, onSaved }) {
  const [pin, setPin] = useState(() => suggestPin());
  const [saving, setSaving] = useState(false);
  const valid = /^\d{6}$/.test(pin);
  const save = async () => {
    setSaving(true);
    const ok = await post(`/staff-app-setup/${employee.id}/pin`, { pin }, onSaved);
    setSaving(false);
    if (ok) onClose();
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: TYPE.heading }}>{employee.app_access ? "Reset PIN" : "Switch on HRMS app"}: {employee.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: TYPE.body }}>
            They sign in at <b>{staffAppUrl()}</b> with <b>{employee.phone}</b> and this PIN, then choose their own PIN.
          </Typography>
          <TextField label="Starting PIN (6 digits)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": "Starting PIN" } }} error={!valid && pin !== ""} helperText="Not a repeated digit or a run like 1234." />
          <Button size="small" variant="text" startIcon={<Copy size={14} />} sx={{ alignSelf: "flex-start" }}
            onClick={() => navigator.clipboard?.writeText(`Vynerix HRMS: ${staffAppUrl()}\nMobile: ${employee.phone}\nStarting PIN: ${pin}`).then(() => toast.success("Copied"), () => {})}>
            Copy sign-in details
          </Button>
          <Alert severity="info" sx={{ fontSize: TYPE.label }}>Share the PIN with the employee in person. Setting it signs them out of the HRMS app on any phone.</Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || saving} onClick={save}>{employee.app_access ? "Reset PIN" : "Switch on"}</Button>
      </DialogActions>
    </Dialog>
  );
}
