import React from "react";
import { Link } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";

const subCardClass =
  "flex items-center gap-2 rounded-lg bg-white dark:bg-gray-800 px-3 py-2 shadow-sm transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:shadow-md group min-h-[48px]";

const UserAccessHome = () => {
  const items = [
    { name: "Create User", path: "/user-access/user", icon: UserGroupIcon },
    { name: "Create Group", path: "/user-access/group", icon: UserGroupIcon },
  ];

  return (
    <section className="p-6">
      <div className="mb-6 grid auto-rows-max content-start gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Link to="/modules" className="flex min-h-[72px] items-center gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-md transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:shadow-lg group">
          <UserGroupIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
          <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">User Access</span>
        </Link>
      </div>

      <div className="grid auto-rows-max content-start gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <Link key={item.path} to={item.path} className={subCardClass}>
            <item.icon className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{item.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default UserAccessHome;
