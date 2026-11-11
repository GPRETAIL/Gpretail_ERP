import { TYPE } from "@/shared/theme/typeScale";
import { Chip } from "@mui/material";

/** Marks a bill line that sells more than the stock on hand (Warehouse Customisation's "sell without stock"). */
export default function NoStockChip({ shortQty, sx }) {
  if (!(shortQty > 0)) return null;
  return (
    <Chip
      size="small"
      color="warning"
      label={`No stock: ${shortQty}`}
      title="Sold without stock. The next purchase or inventory entry settles it."
      sx={{ height: 18, fontSize: TYPE.small, fontWeight: 600, "& .MuiChip-label": { px: 0.75 }, ...sx }}
    />
  );
}
