import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { Box, Button, Card, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import { useTheme } from "../features/theme-context";

const Register = () => {
  const { theme } = useTheme() || {};
  const isDark = theme === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [hoverGoogle, setHoverGoogle] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formValid, setFormValid] = useState(false);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleGoogleLogin = () => {
    alert("Google registration requires backend - not available in frontend-only mode.");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Live validation
  useEffect(() => {
    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match");
      setFormValid(false);
    } else if (
      form.name.trim() === "" ||
      form.email.trim() === "" ||
      form.password.trim() === "" ||
      form.confirmPassword.trim() === ""
    ) {
      setPasswordError("");
      setFormValid(false);
    } else {
      setPasswordError("");
      setFormValid(true);
    }
  }, [form]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formValid) {
      setError("Please fix the errors before submitting.");
      setLoading(false);
      return;
    }

    // Backend removed - show placeholder message
    alert("Api data will show");
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", p: { xs: 2.5, sm: 3 }, bgcolor: "background.default" }}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 448, borderRadius: 4, p: { xs: 3, sm: 5 }, boxShadow: 4, transition: "all 0.3s" }}>
        <Typography variant="h4" component="h2" sx={{ textAlign: "center", fontWeight: 800, mb: 4, color: "text.primary", fontSize: { xs: "1.5rem", sm: "1.875rem" } }}>
          GPRetail Register
        </Typography>

        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }} onSubmit={handleRegister}>
          {/* Name */}
          <TextField
            type="text"
            name="name"
            label="Full Name"
            required
            fullWidth
            size="small"
            value={form.name}
            onChange={handleChange}
          />

          {/* Email */}
          <TextField
            type="email"
            name="email"
            label="Email"
            required
            fullWidth
            size="small"
            value={form.email}
            onChange={handleChange}
          />

          {/* Password */}
          <TextField
            type={showPassword ? "text" : "password"}
            name="password"
            label="Password"
            required
            fullWidth
            size="small"
            value={form.password}
            onChange={handleChange}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePassword} edge="end" size="small">
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Confirm Password */}
          <TextField
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            label="Confirm Password"
            required
            fullWidth
            size="small"
            error={Boolean(passwordError)}
            value={form.confirmPassword}
            onChange={handleChange}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePassword} edge="end" size="small">
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* LIVE PASSWORD MATCH ERROR */}
          {passwordError && (
            <Typography variant="caption" sx={{ color: "error.main", mt: -1.5 }}>
              {passwordError}
            </Typography>
          )}

          {/* Global Error */}
          {error && (
            <Typography variant="body2" sx={{ color: "error.main", textAlign: "center" }}>
              {error}
            </Typography>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={!formValid || loading}
            variant="contained"
            sx={{
              mt: 1,
              py: 1.5,
              fontSize: "1.125rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            {loading ? "Registering..." : "Register"}
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              or
            </Typography>
          </Divider>

          {/* Google Login */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            onMouseEnter={() => setHoverGoogle(true)}
            onMouseLeave={() => setHoverGoogle(false)}
            fullWidth
            variant="outlined"
            startIcon={<FaGoogle style={{ color: hoverGoogle ? "#fff" : "#DB4437" }} size={16} />}
            sx={{ py: 1.5, textTransform: "none", fontWeight: 500, fontSize: "0.875rem" }}
            style={{
              backgroundColor: hoverGoogle ? "#4285F4" : isDark ? "#374151" : "#fff",
              color: hoverGoogle ? "#fff" : isDark ? "#f3f4f6" : "#000",
              transform: hoverGoogle ? "scale(1.01)" : "scale(1)",
              boxShadow: hoverGoogle
                ? "0 4px 10px rgba(66, 133, 244, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.1)",
              borderColor: hoverGoogle ? "#4285F4" : isDark ? "#4b5563" : "#ccc",
            }}
          >
            Register with Google
          </Button>

          {/* Redirect */}
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
            Already have an account?{" "}
            <Box component="a" href="/login" sx={{ color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
              Login
            </Box>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default Register;
