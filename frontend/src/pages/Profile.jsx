import React from "react";
import { useSelector } from "react-redux";
import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { Avatar, Box, Card, Stack, Typography } from "@mui/material";

const Profile = () => {
  // Get user info from Redux store (authSlice)
  const { user } = useSelector((state) => state.auth);

  // Fallback data
  const userName = user?.name || "Guest User";
  const userEmail = user?.email || "guest@example.com";
  const userPhone = user?.phone || "+00 000 000 0000";
  const userPicture = user?.picture || "https://i.pravatar.cc/150?img=68";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 3 }}>
      {/* Page Header */}
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 3, color: "text.primary" }}>
        Profile
      </Typography>

      {/* Profile Card */}
      <Card
        variant="outlined"
        sx={{
          maxWidth: 768,
          mx: "auto",
          p: 3,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          gap: 3,
        }}
      >
        {/* Profile Image */}
        <Box sx={{ flexShrink: 0 }}>
          <Avatar
            src={userPicture}
            alt={userName}
            imgProps={{ onError: (e) => (e.target.src = "https://i.pravatar.cc/150?img=68") }}
            sx={{ width: 128, height: 128, border: 4, borderColor: "divider" }}
          />
        </Box>

        {/* Profile Info */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 0.5, color: "text.primary" }}>
            {userName}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            User ID: {user?.id || "N/A"}
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
              <EnvelopeIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <Typography variant="body2" sx={{ color: "text.primary" }}>{userEmail}</Typography>
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
              <PhoneIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <Typography variant="body2" sx={{ color: "text.primary" }}>{userPhone}</Typography>
            </Stack>
          </Stack>
        </Box>
      </Card>

      {/* Extra Section — Optional */}
      <Card variant="outlined" sx={{ maxWidth: 768, mx: "auto", mt: 4, p: 3 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500, mb: 1.5, color: "text.primary" }}>
          Account Information
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
          You can view and manage your account details here. Add functionality
          such as editing profile information, changing passwords, or managing
          linked accounts as needed.
        </Typography>
      </Card>
    </Box>
  );
};

export default Profile;
