import { Alert, Box, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, alpha } from "@mui/material";
import { TYPE } from "@/shared/theme/typeScale";
import { muiFieldSx } from "@/shared/theme/formControlSizes";
import { DENOMINATIONS, formatCurrency, makeCountKey, toInt } from "./cashClosingUtils";

const labelSx = { width: "40%", fontSize: TYPE.label, fontWeight: 500, color: "text.secondary" };
const readOnlySx = [muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontWeight: 600 } }];
const cellSx = { border: 1, borderColor: "divider", px: 1.5, py: 1 };

function FieldRow({ label, children, alignTop = false }) {
  return (
    <Stack direction="row" sx={{ alignItems: alignTop ? "flex-start" : "center" }}>
      <Typography component="label" sx={{ ...labelSx, ...(alignTop ? { mt: 0.5 } : {}) }}>{label}</Typography>
      {children}
    </Stack>
  );
}

function ReadOnly({ label, value }) {
  return (
    <FieldRow label={label}>
      <TextField type="text" value={value} disabled slotProps={{ input: { readOnly: true }, htmlInput: { "aria-label": label } }} size="small" sx={readOnlySx} />
    </FieldRow>
  );
}

/**
 * The Cash Closing form (details on the left, note counts on the right). `form` comes from useCashClosingForm.
 * Expected cash = opening + cash sales − cash refunds − counter expenses; difference = counted − expected.
 */
export default function CashClosingFields({ form }) {
  const { now, options, formData, setField, handleCountChange, position, loadingPosition, counterOpen, closingAmount, figures, closingBillNo } = form;
  const select = (label, name, list) => (
    <FieldRow label={label}>
      <Box sx={{ flex: 1, ml: 1 }}>
        <TextField select name={name} value={formData[name]} onChange={(e) => setField(name, e.target.value)} size="small" fullWidth sx={muiFieldSx}
          slotProps={{ htmlInput: { "aria-label": label } }}>
          <MenuItem value="">{`Select ${label}`}</MenuItem>
          {list.map((row) => <MenuItem key={row.value} value={row.value}>{row.label}</MenuItem>)}
        </TextField>
      </Box>
    </FieldRow>
  );
  const money = (value) => (loadingPosition ? "Loading..." : formatCurrency(value));

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
      <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
        <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary", mb: 1.5 }}>Cash Closing Details</Typography>
        <Stack spacing={1.5} sx={{ maxWidth: 576 }}>
          <ReadOnly label="Date / Time" value={now.toLocaleString()} />
          {select("Counter", "counterId", options.counters)}
          {formData.counterId && !loadingPosition && !counterOpen && (
            <Alert severity="warning" sx={{ py: 0 }}>This counter is not open. Open it in Sales &gt; Cash Opening first.</Alert>
          )}
          {select("Received By", "receivedByEmployeeId", options.receivedByEmployees)}
          {select("Cashier", "cashierEmployeeId", options.cashiers)}
          <ReadOnly label="Closing Bill No" value={closingBillNo} />
          <ReadOnly label="Opening" value={money(position.openingAmount)} />
          <ReadOnly label="Cash Sales" value={money(position.cashSales)} />
          <ReadOnly label="Cash Refunds" value={money(position.cashRefunds)} />
          <FieldRow label="Counter Expenses">
            <TextField type="number" slotProps={{ htmlInput: { min: 0, step: 0.01, "aria-label": "Counter Expenses" } }} value={formData.counterExpenses}
              onChange={(e) => setField("counterExpenses", e.target.value)} size="small" sx={[muiFieldSx, { flex: 1, ml: 1 }]} />
          </FieldRow>
          <ReadOnly label="Expected Cash" value={money(figures.expected)} />
          <ReadOnly label="Counted Cash" value={formatCurrency(closingAmount)} />
          <Box>
            <ReadOnly label="Difference" value={formatCurrency(figures.difference)} />
            <Typography sx={{ ml: "40%", pl: 1, mt: 0.5, fontSize: TYPE.small, color: figures.difference < 0 ? "error.main" : "text.secondary" }}>
              {`${formatCurrency(closingAmount)} counted − ${formatCurrency(figures.expected)} expected = ${formatCurrency(figures.difference)}${figures.difference < 0 ? " short" : figures.difference > 0 ? " over" : ""}`}
            </Typography>
          </Box>
          <FieldRow label="Notes" alignTop>
            <TextField value={formData.notes} onChange={(e) => setField("notes", e.target.value)} multiline rows={3} size="small"
              slotProps={{ htmlInput: { "aria-label": "Notes" } }} sx={[muiFieldSx, { flex: 1, ml: 1, "& textarea": { resize: "vertical" } }]} />
          </FieldRow>
        </Stack>
      </Box>

      <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
          <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Denominations</Typography>
        </Box>
        <Box sx={{ p: 2, overflowX: "auto" }}>
          <Table sx={{ width: "100%", fontSize: 12.25 }}>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
              <TableRow>
                <TableCell sx={{ ...cellSx, textAlign: "left" }}>Denomination</TableCell>
                <TableCell sx={{ ...cellSx, textAlign: "center" }}>Count</TableCell>
                <TableCell sx={{ ...cellSx, textAlign: "right" }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DENOMINATIONS.map((denomination) => {
                const key = makeCountKey(denomination);
                const count = Math.max(0, toInt(formData[key], 0));
                return (
                  <TableRow key={denomination} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell sx={{ ...cellSx, fontWeight: 600 }}>₹{denomination.toLocaleString("en-IN")}</TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "center" }}>
                      <TextField type="number" slotProps={{ htmlInput: { min: 0, "aria-label": `Count of ₹${denomination}` } }} value={formData[key]}
                        onChange={(e) => handleCountChange(key, e.target.value)} size="small" sx={[muiFieldSx, { width: 96, "& .MuiInputBase-input": { textAlign: "right" } }]} />
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 500 }}>{formatCurrency(count * denomination)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell colSpan={2} sx={{ ...cellSx, fontWeight: 600 }}>Total Closing</TableCell>
                <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 700 }}>{formatCurrency(closingAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
