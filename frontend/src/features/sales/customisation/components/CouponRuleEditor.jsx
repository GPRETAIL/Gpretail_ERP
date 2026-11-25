import { Box, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { normalizeCouponRule, couponRuleSummary } from "../utils/couponRule";

/**
 * Sales Customisation: the coupon given when a bill is settled. The coupon is printed on the receipt, used whole on a
 * later bill, and cannot be given on a bill that was saved offline or left on credit.
 */
export default function CouponRuleEditor({ value, onChange, fieldLabelSx, helpSx }) {
  const rule = normalizeCouponRule(value);
  const set = (patch) => onChange({ ...rule, ...patch });
  // The fields keep what is typed; the server and the sentence below use the cleaned numbers.
  const field = (key, label, extra = {}) => (
    <TextField size="small" type="number" label={label} value={value?.[key] ?? rule[key]} onChange={(event) => set({ [key]: event.target.value })} disabled={!rule.enabled}
      slotProps={{ htmlInput: { min: 0, step: key === "validDays" ? 1 : "0.01" } }} {...extra} />
  );

  return (
    <Box>
      <Typography sx={fieldLabelSx}>Coupon on a paid bill</Typography>
      <Typography sx={helpSx}>
        When a bill is paid in full, the customer can get a coupon for a later bill. It is printed on the receipt and used once, whole.
        A bill that is left on credit or saved offline does not earn one, and what a bill paid with coupons is not counted towards the next coupon.
      </Typography>
      <FormControlLabel control={<Switch checked={rule.enabled} onChange={(event) => set({ enabled: event.target.checked })} />} label="Give a coupon" />
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mt: 1, maxWidth: 560 }}>
        {field("minBill", "Bill amount needed")}
        <TextField select size="small" label="Coupon is worth" value={rule.valueType} onChange={(event) => set({ valueType: event.target.value })} disabled={!rule.enabled}>
          <MenuItem value="amount">A fixed amount</MenuItem>
          <MenuItem value="percent">A percent of the bill</MenuItem>
        </TextField>
        {field("value", rule.valueType === "percent" ? "Percent of the bill" : "Coupon amount")}
        {rule.valueType === "percent" ? field("maxValue", "Most a coupon can be worth", { helperText: "0 means no limit." }) : <Box />}
        {field("validDays", "Valid for (days)", { helperText: "0 means it never expires." })}
        {field("redeemMinBill", "Smallest bill it can be used on", { helperText: "0 means any bill." })}
      </Box>
      <Typography sx={{ ...helpSx, mt: 1.5, fontWeight: 600 }} role="status">{couponRuleSummary(rule)}</Typography>
    </Box>
  );
}
