import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, IconButton, Stack } from "@mui/material";
import { Wallet, X } from "lucide-react";

/**
 * POS: shown while the counter's cash is not opened and Sales Customisation > Cash Opening before billing is on
 * "Warn". Billing still works; "Open cash" goes to Cash Opening, and the notice can be hidden for this visit.
 */
export default function CashNotOpenedBanner({ warning }) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  if (!warning || hidden) return null;

  return (
    <Alert severity="warning" icon={<Wallet size={18} />} role="status" aria-label="Cash not opened" sx={{ py: 0.25, alignItems: "center" }}
      action={(
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Button color="inherit" size="small" onClick={() => navigate("/sales/cash-opening")}>Open cash</Button>
          <IconButton color="inherit" size="small" aria-label="Close" onClick={() => setHidden(true)}><X size={16} /></IconButton>
        </Stack>
      )}>
      {warning.message}
    </Alert>
  );
}
