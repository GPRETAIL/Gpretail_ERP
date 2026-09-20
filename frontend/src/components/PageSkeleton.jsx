import { Box } from "@mui/material";

/**
 * PageSkeleton — shimmer skeleton shown while a page is loading.
 *
 * Props:
 *   variant  {"form" | "table"}  — layout style (default "form")
 *   rows     {number}            — number of skeleton rows (default 8)
 */
const shimmerSx = { borderRadius: 1, bgcolor: "action.hover" };

const HeaderSkeleton = () => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 20, height: 20 }} />
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 192, height: 20 }} />
    </Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 64, height: 28, borderRadius: "3.5px" }} />
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 64, height: 28, borderRadius: "3.5px" }} />
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 64, height: 28, borderRadius: "3.5px" }} />
    </Box>
  </Box>
);

const FormSkeleton = ({ rows = 8 }) => (
  <Box sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
    {/* Two column form layout */}
    <Box sx={{ bgcolor: "background.paper", borderRadius: "5.25px", border: 1, borderColor: "divider", p: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, columnGap: 4, rowGap: 1.5 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box className="animate-pulse" sx={{ ...shimmerSx, width: "33.33%", height: 16 }} />
            <Box className="animate-pulse" sx={{ ...shimmerSx, flex: 1, height: 32, borderRadius: "1.75px" }} />
          </Box>
        ))}
      </Box>
    </Box>
    {/* Bottom section placeholder */}
    <Box sx={{ bgcolor: "background.paper", borderRadius: "5.25px", border: 1, borderColor: "divider", p: 2 }}>
      <Box className="animate-pulse" sx={{ ...shimmerSx, width: 128, height: 16, mb: 1.5 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} className="animate-pulse" sx={{ ...shimmerSx, width: "100%", height: 32, borderRadius: "1.75px" }} />
        ))}
      </Box>
    </Box>
  </Box>
);

const TableSkeleton = ({ rows = 6, cols = 8 }) => (
  <Box sx={{ flex: 1, p: 2 }}>
    <Box sx={{ bgcolor: "background.paper", borderRadius: "5.25px", border: 1, borderColor: "divider", overflow: "hidden" }}>
      {/* Header row */}
      <Box sx={{ display: "flex", gap: 1, p: 1.5, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Box key={i} className="animate-pulse" sx={{ ...shimmerSx, flex: 1, height: 16 }} />
        ))}
      </Box>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <Box key={ri} sx={{ display: "flex", gap: 1, p: 1.5, borderBottom: 1, borderColor: "divider" }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Box
              key={ci}
              className="animate-pulse"
              sx={{ ...shimmerSx, flex: 1, height: 16, width: `${45 + Math.random() * 40}%` }}
            />
          ))}
        </Box>
      ))}
    </Box>
  </Box>
);

const PageSkeleton = ({ variant = "form", rows, cols }) => (
  <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
    <HeaderSkeleton />
    {variant === "table" ? (
      <TableSkeleton rows={rows} cols={cols} />
    ) : (
      <FormSkeleton rows={rows} />
    )}
  </Box>
);

export default PageSkeleton;
