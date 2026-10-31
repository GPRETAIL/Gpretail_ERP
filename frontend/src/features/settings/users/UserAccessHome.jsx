import React from "react";
import { Link } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { alpha } from "@mui/material/styles";
import { Box, ButtonBase, Typography } from "@mui/material";

// indigo has no MUI semantic token equivalent -- kept as literal hex, matching the rest of this
// migration's convention for non-semantic accent colors.
const INDIGO = "#6366f1";
const INDIGO_HOVER = "#4f46e5";

const hoverCardSx = {
  bgcolor: "background.paper",
  boxShadow: 1,
  transition: "background-color 0.2s, box-shadow 0.2s",
  "&:hover": { bgcolor: (theme) => alpha(INDIGO, theme.palette.mode === "dark" ? 0.16 : 0.08), boxShadow: 2 },
};

const UserAccessHome = () => {
  const items = [
    { name: "Create User", path: "/user-access/user", icon: UserGroupIcon },
    { name: "Create Group", path: "/user-access/group", icon: UserGroupIcon },
  ];

  return (
    <Box component="section" sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
        <ButtonBase
          component={Link}
          to="/modules"
          className="group"
          sx={{ minHeight: 72, alignItems: "center", justifyContent: "flex-start", gap: 1.5, borderRadius: "10.5px", p: 2, ...hoverCardSx }}
        >
          <Box sx={{ color: INDIGO, display: "inline-flex", ".group:hover &": { color: INDIGO_HOVER } }}>
            <UserGroupIcon style={{ width: 24, height: 24 }} />
          </Box>
          <Typography sx={{ fontWeight: 500, color: "text.primary", ".group:hover &": { color: INDIGO_HOVER } }}>User Access</Typography>
        </ButtonBase>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" } }}>
        {items.map((item) => (
          <ButtonBase
            key={item.path}
            component={Link}
            to={item.path}
            className="group"
            sx={{ minHeight: 48, justifyContent: "flex-start", gap: 1, borderRadius: "7px", px: 1.5, py: 1, ...hoverCardSx }}
          >
            <Box sx={{ color: INDIGO, display: "inline-flex", flexShrink: 0, ".group:hover &": { color: INDIGO_HOVER } }}>
              <item.icon style={{ width: 16, height: 16 }} />
            </Box>
            <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.primary", ".group:hover &": { color: INDIGO_HOVER } }}>{item.name}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
};

export default UserAccessHome;
