import React from "react";
import { useSelector } from "react-redux";
import { UserIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";

const Profile = () => {
  // Get user info from Redux store (authSlice)
  const { user } = useSelector((state) => state.auth);

  // Fallback data
  const userName = user?.name || "Guest User";
  const userEmail = user?.email || "guest@example.com";
  const userPhone = user?.phone || "+00 000 000 0000";
  const userPicture = user?.picture || "https://i.pravatar.cc/150?img=68";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Page Header */}
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Profile</h1>

      {/* Profile Card */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <img
            src={userPicture}
            alt={userName}
            onError={(e) => (e.target.src = "https://i.pravatar.cc/150?img=68")}
            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-900/40"
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            {userName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">User ID: {user?.id || "N/A"}</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <EnvelopeIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span>{userEmail}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <PhoneIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span>{userPhone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Section — Optional */}
      <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-3">
          Account Information
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          You can view and manage your account details here. Add functionality
          such as editing profile information, changing passwords, or managing
          linked accounts as needed.
        </p>
      </div>
    </div>
  );
};

export default Profile;
