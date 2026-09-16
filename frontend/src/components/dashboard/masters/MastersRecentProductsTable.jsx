import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

export default function MastersRecentProductsTable({ recentProducts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Clock className="h-4 w-4 text-blue-600" />
          Recently Added Products
        </h3>
        <button
          onClick={() => navigate("/masters/product")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all products
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Product</th>
              <th className="pb-2">Brand</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {recentProducts.length > 0 ? (
              recentProducts.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate("/masters/product")}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.name}</td>
                  <td className="py-2.5 text-slate-600 dark:text-gray-400">{row.brand_name}</td>
                  <td className="py-2.5 text-right font-mono">₹{Number(row.selling_price || 0).toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        row.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No products recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
