import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Wallet } from "lucide-react";

/** POS: billing is refused until the counter's cash is opened (Sales Customisation > Require Cash Opening). */
export default function CashNotOpenedDialog({ block, onClose }) {
  const navigate = useNavigate();
  if (!block) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="cash-not-opened-title">
      <DialogTitle id="cash-not-opened-title" sx={{ display: "flex", alignItems: "center", gap: 1 }}><Wallet size={20} /> Cash not opened</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14 }}>{block.message || "Open the cash for your counter before billing."}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1 }}>
          Count the opening cash in the drawer and save it in Cash Opening; then bills can be saved.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Later</Button>
        <Button variant="contained" onClick={() => navigate("/sales/cash-opening")} autoFocus>Open cash</Button>
      </DialogActions>
    </Dialog>
  );
}
