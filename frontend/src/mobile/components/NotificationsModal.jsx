import { Dialog, DialogActions, Button } from "@mui/material";
import NotificationInboxPanel from "../../components/NotificationInboxPanel";
export default function NotificationsModal({ isOpen, onClose }) {
  return <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm" aria-label="Notifications">
    {isOpen && <NotificationInboxPanel />}
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}
