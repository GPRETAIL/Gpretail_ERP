import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
};

const TABS = [
  { key: "balances", label: "Balances" },
  { key: "transactions", label: "Transaction History" },
];

const CrmLoyaltyManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("balances");
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const request =
      activeTab === "balances"
        ? api.get("/loyalty/balances", { params: { search, limit: 50 } })
        : api.get("/loyalty/transactions", { params: { limit: 50 } });

    request
      .then((res) => {
        if (activeTab === "balances") {
          setBalances(res.data?.data || []);
          setTotalPoints(toNum(res.data?.totalPoints, 0));
        } else {
          setTransactions(res.data?.data || []);
        }
      })
      .catch(() => toast.error("Failed to load loyalty data"))
      .finally(() => setLoading(false));
  }, [activeTab, search]);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive text-[11px]">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button type="button" onClick={() => navigate("/crm")} className="text-blue-600 dark:text-blue-400 hover:underline">
              CRM
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Loyalty Management</span>
          </h1>
        </div>
        {activeTab === "balances" && (
          <div className="text-gray-500 dark:text-gray-400">
            Total points across customers: <span className="font-semibold text-gray-800 dark:text-gray-100">{totalPoints}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 min-h-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 border-b-2 font-medium ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "balances" && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or loyalty card..."
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1.5 w-64"
            />
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : activeTab === "balances" ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Loyalty Card</th>
                  <th className="text-right px-3 py-2">Points</th>
                  <th className="text-left px-3 py-2">Loyalty</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No customers found.
                    </td>
                  </tr>
                )}
                {balances.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer"
                    onClick={() => navigate(`/crm/customer/${row.id}/profile`)}
                  >
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.phone || "--"}</td>
                    <td className="px-3 py-2">{row.loyalty_card_number || "--"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{row.loyalty_points}</td>
                    <td className="px-3 py-2">
                      {row.disable_loyalty ? (
                        <span className="text-gray-400">Disabled</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Points</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Sale Invoice</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No loyalty transactions yet.
                    </td>
                  </tr>
                )}
                {transactions.map((row) => (
                  <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-2">{row.customer?.name || "--"}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2 text-right">{row.points}</td>
                    <td className="px-3 py-2 text-right">₹{toNum(row.amount, 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{row.pos_sale?.invoice_no || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrmLoyaltyManagement;
