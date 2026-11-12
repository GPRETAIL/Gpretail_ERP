import { Printer, Save, X } from "lucide-react";
import { Box, Button, Checkbox, IconButton, Radio, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, alpha } from "@mui/material";
import { TYPE } from "@/shared/theme/typeScale";
import { DialogSelectField, DialogTextField } from "./PosSalesFormFields";
import { formatMoney, posSalesDialogNativeSelectSx, toNum } from "../utils/posSalesUtils";

// PosSales pop-ups: Sales Man, Quick Customer, Sale Discount and POS Payment. PosSales owns their state and actions;
// these only draw them. Clicking the dimmed background or the X closes a pop-up.

const overlaySx = { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 };
const panelBaseSx = { borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 };
const numberInputProps = { htmlInput: { min: 0, step: 0.01 } };

function PosDialogShell({ onClose, panelSx, headerSx, title, subtitle, closeLabel, children }) {
  return (
    <Box sx={overlaySx} onClick={onClose}>
      <Box sx={{ ...panelSx, ...panelBaseSx }} onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", ...headerSx }}>
          <Box>
            <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
            <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{subtitle}</Typography>
          </Box>
          <IconButton
            type="button"
            onClick={onClose}
            size="small"
            aria-label={closeLabel}
            sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
          >
            <X size={16} />
          </IconButton>
        </Stack>
        {children}
      </Box>
    </Box>
  );
}

/** Sales Man ID for one bill line; Enter or Save looks it up. */
export function SalesManDialog({ value, onChange, onSave, onClose }) {
  return (
    <PosDialogShell
      onClose={onClose}
      panelSx={{ width: "100%", maxWidth: 448 }}
      headerSx={{ px: 2, py: 1.5 }}
      title="Sales Man"
      subtitle="Write or scan the Sales Man ID"
      closeLabel="Close sales man dialog"
    >
      <Box sx={{ px: 2, py: 2 }}>
        <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: TYPE.label, fontWeight: 700, color: "error.main" }}>Sales Man ID</Typography>
        <TextField
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }
          }}
          placeholder="Write or scan Sales Man ID"
          size="small"
          fullWidth
          autoFocus
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
        <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">
          Cancel
        </Button>
        <Button type="button" onClick={onSave} className="glass-btn glass-btn-primary">
          Save
        </Button>
      </Stack>
    </PosDialogShell>
  );
}

/**
 * Quick Customer: create a customer, or find one by mobile number (Enter on Mobile No lists matches below)
 * and select them for the bill. Enter moves to the next field.
 */
export function QuickCustomerDialog({
  customer, configOptions, fieldRefs, results, selectedId, selectedRow, saving,
  onChange, onFieldKeyDown, onSelectId, onApplySelection, onSave, onClose,
}) {
  const field = ({ name, label, type, options }) => {
    const common = {
      label,
      name,
      value: customer[name],
      onChange,
      onKeyDown: (event) => onFieldKeyDown(name, event),
      inputRef: (node) => {
        fieldRefs.current[name] = node;
      },
    };
    return options ? <DialogSelectField {...common} options={options} /> : <DialogTextField {...common} type={type} />;
  };
  const pair = (left, right) => (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
      {field(left)}
      {field(right)}
    </Box>
  );

  return (
    <PosDialogShell
      onClose={onClose}
      panelSx={{ display: "flex", maxHeight: "92vh", width: "100%", maxWidth: 1280, flexDirection: "column" }}
      headerSx={{ px: 2.5, py: 2 }}
      title="Quick Customer"
      subtitle="Press Enter to move to next field. On mobile number Enter, existing customers appear below."
      closeLabel="Close quick customer dialog"
    >
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, columnGap: 3, rowGap: 2 }}>
          {field({ name: "mobileNo", label: "Mobile No" })}
          {field({ name: "address", label: "Address" })}

          {field({ name: "name", label: "Name" })}
          {pair({ name: "cityId", label: "City", options: configOptions.cities }, { name: "stateId", label: "State", options: configOptions.states })}

          {pair({ name: "dateOfBirth", label: "Date of Birth", type: "date" }, { name: "billingName", label: "Billing Name" })}
          {pair({ name: "customerCategoryId", label: "Customer Category", options: configOptions.customerCategories }, { name: "sectionReligion", label: "Section/Religion" })}

          {pair({ name: "cardNo", label: "Card No" }, { name: "gstNo", label: "GST No" })}
          {pair({ name: "emailId", label: "Email Id" }, { name: "areaId", label: "Area", options: configOptions.areas })}

          <Box sx={{ gridColumn: { xl: "span 2" } }}>
            <Typography sx={{ mb: 1, fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Search Results</Typography>
            <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
              <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                <Table sx={{ width: "100%", minWidth: 720 }} size="small">
                  <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ width: 40 }} />
                      <TableCell>Name</TableCell>
                      <TableCell>GSTNO</TableCell>
                      <TableCell>Area</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.disabled" }}>
                          No matched customers
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((row) => {
                        const isSelected = row.value === selectedId;
                        return (
                          <TableRow
                            key={row.value}
                            sx={{ bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) : "background.paper", "&:hover": { bgcolor: isSelected ? undefined : "action.hover" } }}
                          >
                            <TableCell>
                              <Radio checked={isSelected} onChange={() => onSelectId(row.value)} size="small" />
                            </TableCell>
                            <TableCell>{row.name || "-"}</TableCell>
                            <TableCell>{row.gstNo || "-"}</TableCell>
                            <TableCell>{row.areaName || "-"}</TableCell>
                            <TableCell>{row.mobileNo || "-"}</TableCell>
                            <TableCell>
                              <Button type="button" onClick={() => onApplySelection(row)} className="glass-btn glass-btn-primary" size="small">
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", px: 2.5, py: 2 }}>
        <Button type="button" onClick={onSave} disabled={saving} className="glass-btn glass-btn-success">
          {saving ? "Saving..." : "Save"}
        </Button>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Button type="button" onClick={() => onApplySelection(selectedRow)} disabled={!selectedRow} className="glass-btn glass-btn-primary">
            Select
          </Button>
          <Button type="button" onClick={onClose} disabled={saving} className="glass-btn glass-btn-secondary">
            Close
          </Button>
        </Stack>
      </Stack>
    </PosDialogShell>
  );
}

/**
 * Sale Discount: tick bill lines and give them a discount, as a percentage or a value, per line or for all
 * the ticked lines at once. Nothing changes on the bill until Apply.
 */
export function DiscountDialog({
  rows, allSelected, selectedSet, percentInput, valueInput, totals,
  onToggleAll, onToggleRow, onRowPercentChange, onRowValueChange, onPercentChange, onValueChange, onApply, onClose,
}) {
  return (
    <PosDialogShell
      onClose={onClose}
      panelSx={{ display: "flex", maxHeight: "86vh", width: "100%", maxWidth: 1024, flexDirection: "column" }}
      headerSx={{ px: 2.5, py: 2 }}
      title="Sale Discount"
      subtitle="Select sale rows and apply a discount percentage to the current POS bill."
      closeLabel="Close discount dialog"
    >
      <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2 }}>
        <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
          <Box sx={{ maxHeight: "44vh", overflow: "auto" }}>
            <Table sx={{ width: "100%", minWidth: 860 }} size="small">
              <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ width: 48 }}>
                    <Checkbox checked={allSelected} onChange={onToggleAll} size="small" />
                  </TableCell>
                  <TableCell>Barcode</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell align="right">Addin %</TableCell>
                  <TableCell align="right">D.Value</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((line, index) => (
                  <TableRow key={line.lineId} hover>
                    <TableCell>
                      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                        <Checkbox checked={selectedSet.has(line.lineId)} onChange={() => onToggleRow(line.lineId)} size="small" />
                        <Box component="span" sx={{ color: "text.secondary" }}>{index + 1}</Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{line.barcode || "-"}</TableCell>
                    <TableCell>{line.productName || "-"}</TableCell>
                    <TableCell align="right">{formatMoney(line.price)}</TableCell>
                    <TableCell align="right">{toNum(line.qty, 0)}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{`${formatMoney(line.discount)} @ ${line.appliedPercent}%`}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        slotProps={numberInputProps}
                        value={line.percentInput}
                        onChange={(event) => onRowPercentChange(line.lineId, event.target.value)}
                        size="small"
                        sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        slotProps={numberInputProps}
                        value={line.valueInput}
                        onChange={(event) => onRowValueChange(line.lineId, event.target.value)}
                        size="small"
                        sx={{ width: 96, "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatMoney(line.previewNetAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>

      <Stack sx={{ flexDirection: { xs: "column", lg: "row" }, gap: 1.5, borderTop: 1, borderColor: "divider", px: 2.5, py: 2, alignItems: { lg: "center" }, justifyContent: { lg: "space-between" } }}>
        <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Discount %</Typography>
            <TextField
              type="number"
              slotProps={numberInputProps}
              value={percentInput}
              onChange={(event) => onPercentChange(event.target.value)}
              size="small"
              autoFocus
              sx={{ width: 128, "& .MuiInputBase-input": { fontSize: 12.25 } }}
            />
          </Box>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>D.Value</Typography>
            <TextField
              type="number"
              slotProps={numberInputProps}
              value={valueInput}
              onChange={(event) => onValueChange(event.target.value)}
              size="small"
              sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25 } }}
            />
          </Box>
          <Typography sx={{ pb: 1, fontSize: 12.25, color: "text.secondary" }}>
            Allowed on selected amount: {formatMoney(totals.selectedAmount)}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
          <Button type="button" onClick={onApply} className="glass-btn glass-btn-primary">
            Apply ({formatMoney(totals.previewDiscountValue)})
          </Button>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">
            Close
          </Button>
        </Stack>
      </Stack>
    </PosDialogShell>
  );
}

const paymentRowSx = { justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 };
const warningBoxSx = {
  borderColor: (theme) => alpha(theme.palette.warning.main, 0.4),
  bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
};
const paymentLabelSx = { fontSize: TYPE.small, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" };

function PaymentChoiceSelect({ selectRef, value, placeholder, options, onChange, onKeyDown }) {
  return (
    <Box component="select" ref={selectRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} sx={posSalesDialogNativeSelectSx}>
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </Box>
  );
}

/**
 * POS Payment: the bill totals, a refund to confirm when a return credit exceeds the bill, and cash, card
 * and UPI received (card needs a card type, UPI a provider). Save or Save & Print checks out.
 */
export function PaymentDialog({
  totals, totalDiscount, refundAmount, form, cardTypes, upiProviders, cardTypeSelectRef, upiProviderSelectRef, saving,
  onFieldChange, onCardTypeChange, onUpiProviderChange, onToggleRefund,
  onCashKeyDown, onCardAmountKeyDown, onCardTypeKeyDown, onUpiAmountKeyDown, onUpiProviderKeyDown, onSave, onClose,
}) {
  return (
    <PosDialogShell
      onClose={onClose}
      panelSx={{ width: "100%", maxWidth: 768 }}
      headerSx={{ px: 2, py: 1.5 }}
      title="POS Payment"
      subtitle="Review bill amount and enter received payment"
      closeLabel="Close payment dialog"
    >
      <Box sx={{ display: "grid", gap: 2, px: 2, py: 2, gridTemplateColumns: { lg: "1.05fr 1.4fr" } }}>
        <Stack sx={{ gap: 1, fontSize: 12.25 }}>
          <Stack direction="row" sx={paymentRowSx}>
            <Box component="span" sx={{ color: "text.secondary" }}>Bill(s) Amount</Box>
            <Box component="span" sx={{ fontWeight: 600, color: totals.billAmount < 0 ? "error.main" : "text.primary" }}>
              {formatMoney(totals.billAmount)}
            </Box>
          </Stack>
          <Stack direction="row" sx={paymentRowSx}>
            <Box component="span" sx={{ color: "text.secondary" }}>Discount Amount</Box>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(totalDiscount)}</Box>
          </Stack>
          <Stack direction="row" sx={paymentRowSx}>
            <Box component="span" sx={{ color: "text.secondary" }}>Net Amount</Box>
            <Box component="span" className="pos-total" sx={{ fontWeight: 800, fontSize: TYPE.posTotal, fontVariantNumeric: "tabular-nums", color: totals.netAmount < 0 ? "error.main" : "text.primary" }}>
              {formatMoney(totals.netAmount)}
            </Box>
          </Stack>
          <Stack direction="row" sx={paymentRowSx}>
            <Box component="span" sx={{ color: "text.secondary" }}>Balance</Box>
            <Box component="span" sx={{ fontWeight: 600, color: totals.balanceAmount > 0 ? "error.main" : "success.main" }}>
              {formatMoney(totals.balanceAmount)}
            </Box>
          </Stack>
          <Stack direction="row" sx={paymentRowSx}>
            <Box component="span" sx={{ color: "text.secondary" }}>Received</Box>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(totals.receivedAmount)}</Box>
          </Stack>
          {totals.changeAmount > 0 && (
            <Stack direction="row" sx={{ ...paymentRowSx, ...warningBoxSx }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Change</Box>
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(totals.changeAmount)}</Box>
            </Stack>
          )}
        </Stack>

        <Stack sx={{ gap: 2 }}>
          {refundAmount > 0 && (
            <Box sx={{ borderRadius: "3.5px", border: 1, ...warningBoxSx, p: 1.5 }}>
              <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontSize: TYPE.small, color: "warning.dark" }}>
                  Confirm the refund before saving. Any received amount is added to the refund.
                </Typography>
                <Button type="button" onClick={onToggleRefund} className={form.refundApproved ? "glass-btn glass-btn-success" : "glass-btn glass-btn-primary"}>
                  {form.refundApproved ? `Refunded ${formatMoney(refundAmount)}` : `Refund ${formatMoney(refundAmount)}`}
                </Button>
              </Stack>
            </Box>
          )}

          <Stack sx={{ gap: 1 }}>
            <Typography sx={paymentLabelSx}>Cash</Typography>
            <TextField
              type="number"
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, "aria-label": "Cash received" } }}
              value={form.cashAmount}
              onChange={(event) => onFieldChange("cashAmount", event.target.value)}
              onKeyDown={onCashKeyDown}
              size="small"
              fullWidth
              placeholder="Enter cash received"
            />
          </Stack>

          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "1fr 1fr" } }}>
            <Stack sx={{ gap: 1 }}>
              <Typography sx={paymentLabelSx}>Card Amount</Typography>
              <TextField
                type="number"
                slotProps={numberInputProps}
                value={form.cardAmount}
                onChange={(event) => onFieldChange("cardAmount", event.target.value)}
                onKeyDown={onCardAmountKeyDown}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack sx={{ gap: 1 }}>
              <Typography sx={paymentLabelSx}>Card Type</Typography>
              <PaymentChoiceSelect selectRef={cardTypeSelectRef} value={form.cardTypeId} placeholder="Select card type" options={cardTypes} onChange={onCardTypeChange} onKeyDown={onCardTypeKeyDown} />
            </Stack>
          </Box>

          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "1fr 1fr" } }}>
            <Stack sx={{ gap: 1 }}>
              <Typography sx={paymentLabelSx}>UPI Amount</Typography>
              <TextField
                type="number"
                slotProps={numberInputProps}
                value={form.upiAmount}
                onChange={(event) => onFieldChange("upiAmount", event.target.value)}
                onKeyDown={onUpiAmountKeyDown}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack sx={{ gap: 1 }}>
              <Typography sx={paymentLabelSx}>UPI Provider</Typography>
              <PaymentChoiceSelect selectRef={upiProviderSelectRef} value={form.upiProviderId} placeholder="Select UPI provider" options={upiProviders} onChange={onUpiProviderChange} onKeyDown={onUpiProviderKeyDown} />
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1, borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
        <Button type="button" onClick={onClose} disabled={saving} className="glass-btn glass-btn-secondary">
          Cancel
        </Button>
        <Button type="button" onClick={() => onSave(false)} disabled={saving} className="glass-btn glass-btn-success" startIcon={<Save size={16} />}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" onClick={() => onSave(true)} disabled={saving} className="glass-btn glass-btn-primary" startIcon={<Printer size={16} />}>
          {saving ? "Saving..." : "Save & Print"}
        </Button>
      </Stack>
    </PosDialogShell>
  );
}
