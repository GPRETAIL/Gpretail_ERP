import { Box } from "@mui/material";

/**
 * Phone text size for the screens shared with the business mobile app (leave, expenses, payslips, tax, attendance
 * card). Those screens use small fixed sizes (10 to 13px) that suit a busy dashboard but are hard to read in an
 * employee app, so here they are shown 18% larger. The business app is not touched.
 */
export const STAFF_SHARED_ZOOM = 1.18;

export default function StaffScreen({ children }) {
  return <Box sx={{ zoom: STAFF_SHARED_ZOOM }}>{children}</Box>;
}
