import React from "react";

const DashboardPlaceholder = ({ title, description }) => (
  <div className="rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
    <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">{title}</h2>
    <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">{description}</p>
  </div>
);

export default DashboardPlaceholder;
