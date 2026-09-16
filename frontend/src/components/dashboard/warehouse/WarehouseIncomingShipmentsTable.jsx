import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function WarehouseIncomingShipmentsTable({ incoming = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Truck className="h-4 w-4 text-blue-600" />
          Recent Inward Shipments & Direct Purchases
        </h3>
        <button
          onClick={() => navigate("/warehouse/direct-purchase")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all incoming
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Purchase / Inv No</th>
              <th className="pb-2">Supplier</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {incoming.length > 0 ? (
              incoming.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/warehouse/direct-purchase`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">
                    {row.purchase_no || row.invoice_no || `PUR-${row.id}`}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.supplier_name}</td>
                  <td className="py-2.5 text-right font-mono font-semibold">
                    {Number(row.total_qty || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(row.total_amount)}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {row.status || "Completed"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No incoming shipments recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
