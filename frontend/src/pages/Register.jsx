import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { Navigate } from "react-router-dom";
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
    <div className="min-h-screen flex justify-center items-center p-5 bg-gradient-to-br from-blue-200 to-blue-400 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
        <h2 className="text-center text-3xl text-gray-800 dark:text-gray-100 font-extrabold mb-8">
          GPRetail Register
        </h2>

        <form className="flex flex-col space-y-5" onSubmit={handleRegister}>
          {/* Name */}
          <div className="relative">
            <input
              type="text"
              name="name"
              placeholder=" "
              required
              value={form.name}
              onChange={handleChange}
              className="peer w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              placeholder-transparent transition-all duration-200"
            />
            <label
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm
              peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-0 peer-focus:text-xs peer-focus:-translate-y-0
              peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Full Name
            </label>
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder=" "
              required
              value={form.email}
              onChange={handleChange}
              className="peer w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              placeholder-transparent transition-all duration-200"
            />
            <label
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm
              peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-0 peer-focus:text-xs peer-focus:-translate-y-0
              peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Email
            </label>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder=" "
              required
              value={form.password}
              onChange={handleChange}
              className="peer w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              placeholder-transparent transition-all duration-200"
            />
            <label
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2
              peer-placeholder-shown:text-sm peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-0 peer-focus:text-xs peer-focus:-translate-y-0
              peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Password
            </label>

            <span
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer
              text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder=" "
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className={`peer w-full p-3 text-sm border ${
                passwordError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-transparent transition-all duration-200`}
            />
            <label
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2
              peer-placeholder-shown:text-sm peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-0 peer-focus:text-xs peer-focus:-translate-y-0
              peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Confirm Password
            </label>

            <span
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer
              text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* LIVE PASSWORD MATCH ERROR */}
          {passwordError && (
            <p className="text-red-500 dark:text-red-400 text-xs -mt-3">{passwordError}</p>
          )}

          {/* Global Error */}
          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center mt-1">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!formValid || loading}
            className={`w-full py-3 mt-3 text-white text-lg font-semibold rounded-lg transition duration-150 shadow-md
            ${
              formValid
                ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
                : "bg-blue-300 dark:bg-blue-800/60 cursor-not-allowed"
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>

          {/* Divider */}
          <div className="flex items-center my-4 space-x-3">
            <span className="grow h-px bg-gray-300 dark:bg-gray-600"></span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">or</span>
            <span className="grow h-px bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            onMouseEnter={() => setHoverGoogle(true)}
            onMouseLeave={() => setHoverGoogle(false)}
            className="w-full py-3 flex items-center justify-center border rounded-lg font-medium text-sm transition-all duration-300"
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
            <FaGoogle
              className="mr-2 w-4 h-4"
              style={{ color: hoverGoogle ? "#fff" : "#DB4437" }}
            />
            Register with Google
          </button>

          {/* Redirect */}
          <p className="mt-4 text-center text-sm text-gray-700 dark:text-gray-300">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
