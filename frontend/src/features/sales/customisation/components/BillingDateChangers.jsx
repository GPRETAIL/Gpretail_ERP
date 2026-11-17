import { useEffect, useState } from "react";
import { Autocomplete, Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { BILLING_DATE_ROLES } from "../utils/salesReceiptCustomisation";

/**
 * Sales Customisation > Billing date (Manual): who may change a counter's billing date on POS. The tenant admin always
 * can and is the only one who decides who else may (roles and/or named users); everyone else sees it read-only.
 */
export default function BillingDateChangers({ value, onChange, editable }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!editable) return undefined;
    let live = true;
    api.get("/user-access").then((res) => { if (live) setUsers(Array.isArray(res.data?.data?.users) ? res.data.data.users : []); }).catch(() => {});
    return () => { live = false; };
  }, [editable]);

  const roles = value?.roles || [];
  const userIds = (value?.users || []).map(Number);
  const chosen = users.filter((u) => userIds.includes(Number(u.id)));

  return (
    <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Who can change the billing date on POS</Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
        The tenant admin always can{editable ? ". Tick roles and/or pick users to allow them too." : "; only the tenant admin can change who else may."}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 1 }}>
        {BILLING_DATE_ROLES.map(({ value: role, label }) => (
          <FormControlLabel key={role} label={label} disabled={!editable}
            control={<Checkbox size="small" checked={roles.includes(role)}
              onChange={(e) => onChange({ roles: e.target.checked ? [...roles, role] : roles.filter((r) => r !== role), users: userIds })} />} />
        ))}
      </Stack>
      {editable ? (
        <Autocomplete multiple size="small" options={users} value={chosen} isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
          getOptionLabel={(u) => `${u.name}${u.role ? ` (${u.role})` : ""}`} onChange={(_, next) => onChange({ roles, users: next.map((u) => Number(u.id)) })}
          renderInput={(params) => <TextField {...params} label="Also these users" placeholder="Pick users" />} sx={{ mt: 1, maxWidth: 520 }} />
      ) : userIds.length ? (
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Also {userIds.length} named user{userIds.length > 1 ? "s" : ""}.</Typography>
      ) : null}
    </Box>
  );
}
