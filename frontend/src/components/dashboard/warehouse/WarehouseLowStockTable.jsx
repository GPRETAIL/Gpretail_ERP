import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function WarehouseLowStockTable({ alerts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Low Stock & Reorder Level Alerts</h3>
        </div>
        <button
          onClick={() => navigate("/warehouse/item-locator?stock_filter=low_stock")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          Open Item Locator
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Product Name</th>
              <th className="pb-2">Size / Color</th>
              <th className="pb-2">Barcode</th>
              <th className="pb-2">Store</th>
              <th className="pb-2 text-right">Available</th>
              <th className="pb-2 text-right">Reorder Level</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {alerts.length > 0 ? (
              alerts.map((row) => {
                const isOut = Number(row.current_stock || 0) <= 0;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                    <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.product_name}</td>
                    <td className="py-2.5 text-slate-600 dark:text-gray-400">
                      {row.size} / {row.color}
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">{row.barcode}</td>
                    <td className="py-2.5 text-slate-600 dark:text-gray-400">{row.store_name}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-gray-100">
                      {Number(row.current_stock || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-500">{row.reorder_level || 10}</td>
                    <td className="py-2.5 text-center">
                      {isOut ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          LOW STOCK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  🎉 All product stocks are healthy and above reorder levels!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
