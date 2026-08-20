import React, { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => `₹${toNum(value, 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString();
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Order History" },
  { key: "loyalty", label: "Loyalty & Redemptions" },
];

const StatCard = ({ label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
    <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-sm font-semibold mt-1">{value}</div>
  </div>
);

const CrmCustomerProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/customers/${id}/profile`)
      .then((res) => setData(res.data?.data || null))
      .catch(() => toast.error("Failed to load customer profile"))
      .finally(() => setLoading(false));
  }, [id]);

  const customer = data?.customer;
  const highlights = data?.highlights || {};
  const loyalty = data?.loyalty || {};

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
            <button type="button" onClick={() => navigate("/crm/customer")} className="text-blue-600 dark:text-blue-400 hover:underline">
              Customer
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Profile</span>
          </h1>
        </div>
        <button
          className="glass-btn glass-btn-primary flex items-center"
          onClick={() => navigate(`/crm/customer/${id}`)}
        >
          <Pencil className="w-3 h-3 mr-1" /> Edit
        </button>
      </div>

      <div className="flex-1 p-4 min-h-0 overflow-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : !customer ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Customer not found.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-lg font-bold shrink-0">
                  {(customer.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold">{customer.name}</div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {customer.code} {customer.phone ? `• ${customer.phone}` : ""} {customer.email ? `• ${customer.email}` : ""}
                  </div>
                </div>
              </div>
            </div>

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

            {activeTab === "overview" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Highlights</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <StatCard label="Orders" value={highlights.ordersCount ?? 0} />
                    <StatCard label="Average Amount" value={formatMoney(highlights.averageAmount)} />
                    <StatCard label="Lifetime Spend" value={formatMoney(highlights.lifetimeSpend)} />
                    <StatCard label="Last Visit" value={formatDate(highlights.lastVisit)} />
                    <StatCard
                      label="Avg. Visit Gap"
                      value={highlights.averageVisitGapDays != null ? `${highlights.averageVisitGapDays} days` : "--"}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Reward Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <StatCard label="Available Points" value={loyalty.availablePoints ?? 0} />
                    <StatCard label="Life Time Points" value={loyalty.lifetimePoints ?? 0} />
                    <StatCard label="Redeemed Points" value={loyalty.redeemedPoints ?? 0} />
                    <StatCard label="Redemptions" value={loyalty.redemptionCount ?? 0} />
                    <StatCard label="Last Redemption" value={formatDate(loyalty.lastRedemption)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Invoice</th>
                      <th className="text-right px-3 py-2">Items</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-left px-3 py-2">Payment</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.orderHistory || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                          No POS sales for this customer yet.
                        </td>
                      </tr>
                    )}
                    {(data.orderHistory || []).map((row) => (
                      <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">{formatDate(row.sale_date)}</td>
                        <td className="px-3 py-2">{row.invoice_no}</td>
                        <td className="px-3 py-2 text-right">{row.total_items}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(row.grand_total)}</td>
                        <td className="px-3 py-2">{row.payment_mode}</td>
                        <td className="px-3 py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data.customerOrders || []).length > 0 && (
                  <>
                    <div className="px-3 py-2 font-semibold border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                      Custom Orders
                    </div>
                    <table className="w-full">
                      <tbody>
                        {data.customerOrders.map((row) => (
                          <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2">{formatDate(row.order_date)}</td>
                            <td className="px-3 py-2">{row.order_no}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(row.net_amount)}</td>
                            <td className="px-3 py-2">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {activeTab === "loyalty" && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-right px-3 py-2">Points</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-right px-3 py-2">Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.loyaltyTransactions || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                          No loyalty activity yet.
                        </td>
                      </tr>
                    )}
                    {(data.loyaltyTransactions || []).map((row) => (
                      <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                        <td className="px-3 py-2">{row.type}</td>
                        <td className="px-3 py-2 text-right">{row.points}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2 text-right">{row.balance_after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmCustomerProfile;
