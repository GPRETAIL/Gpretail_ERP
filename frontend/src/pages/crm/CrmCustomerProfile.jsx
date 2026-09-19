import React, { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
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
  <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "7px", p: 1.5 }}>
    <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>{value}</Typography>
  </Box>
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
    <Box className="master-responsive" sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default", color: "text.primary", fontSize: 11 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 13, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/crm")} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              CRM
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Button type="button" variant="text" onClick={() => navigate("/crm/customer")} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              Customer
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Profile</Box>
          </Stack>
        </Stack>
        <Button className="glass-btn glass-btn-primary flex items-center" onClick={() => navigate(`/crm/customer/${id}`)}>
          <Pencil className="w-3 h-3 mr-1" /> Edit
        </Button>
      </Stack>

      <Box sx={{ flex: 1, p: 2, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <Typography sx={{ textAlign: "center", py: 4, fontSize: "inherit", color: "text.secondary" }}>Loading...</Typography>
        ) : !customer ? (
          <Typography sx={{ textAlign: "center", py: 4, fontSize: "inherit", color: "text.secondary" }}>Customer not found.</Typography>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", p: 2, border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 48, height: 48, borderRadius: "50%", bgcolor: (theme) => (theme.palette.mode === "dark" ? "primary.dark" : "primary.light"),
                    color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15.75, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {(customer.name || "?").charAt(0).toUpperCase()}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{customer.name}</Typography>
                  <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
                    {customer.code} {customer.phone ? `• ${customer.phone}` : ""} {customer.email ? `• ${customer.email}` : ""}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} sx={{ borderBottom: 1, borderColor: "divider" }}>
              {TABS.map((tab) => (
                <Box
                  component="button"
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{
                    px: 1.5, py: 1, border: 0, borderBottom: "2px solid", fontWeight: 500, fontSize: "inherit",
                    cursor: "pointer", bgcolor: "transparent", fontFamily: "inherit",
                    ...(activeTab === tab.key
                      ? { borderBottomColor: "primary.main", color: "primary.main" }
                      : { borderBottomColor: "transparent", color: "text.secondary", "&:hover": { color: "text.primary" } }),
                  }}
                >
                  {tab.label}
                </Box>
              ))}
            </Stack>

            {activeTab === "overview" && (
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1, fontSize: "inherit" }}>Customer Highlights</Typography>
                  <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" } }}>
                    <StatCard label="Orders" value={highlights.ordersCount ?? 0} />
                    <StatCard label="Average Amount" value={formatMoney(highlights.averageAmount)} />
                    <StatCard label="Lifetime Spend" value={formatMoney(highlights.lifetimeSpend)} />
                    <StatCard label="Last Visit" value={formatDate(highlights.lastVisit)} />
                    <StatCard
                      label="Avg. Visit Gap"
                      value={highlights.averageVisitGapDays != null ? `${highlights.averageVisitGapDays} days` : "--"}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1, fontSize: "inherit" }}>Reward Status</Typography>
                  <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" } }}>
                    <StatCard label="Available Points" value={loyalty.availablePoints ?? 0} />
                    <StatCard label="Life Time Points" value={loyalty.lifetimePoints ?? 0} />
                    <StatCard label="Redeemed Points" value={loyalty.redeemedPoints ?? 0} />
                    <StatCard label="Redemptions" value={loyalty.redemptionCount ?? 0} />
                    <StatCard label="Last Redemption" value={formatDate(loyalty.lastRedemption)} />
                  </Box>
                </Box>
              </Stack>
            )}

            {activeTab === "orders" && (
              <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", border: "1px solid", borderColor: "divider", overflow: "auto" }}>
                <Table sx={{ width: "100%", "& th, & td": { fontSize: "inherit" } }}>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Date</TableCell>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Invoice</TableCell>
                      <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Items</TableCell>
                      <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Total</TableCell>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Payment</TableCell>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.orderHistory || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No POS sales for this customer yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {(data.orderHistory || []).map((row) => (
                      <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{formatDate(row.sale_date)}</TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{row.invoice_no}</TableCell>
                        <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{row.total_items}</TableCell>
                        <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{formatMoney(row.grand_total)}</TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{row.payment_mode}</TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(data.customerOrders || []).length > 0 && (
                  <>
                    <Typography sx={{ px: 1.5, py: 1, fontWeight: 600, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: "inherit" }}>
                      Custom Orders
                    </Typography>
                    <Table sx={{ width: "100%", "& th, & td": { fontSize: "inherit" } }}>
                      <TableBody>
                        {data.customerOrders.map((row) => (
                          <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                            <TableCell sx={{ px: 1.5, py: 1 }}>{formatDate(row.order_date)}</TableCell>
                            <TableCell sx={{ px: 1.5, py: 1 }}>{row.order_no}</TableCell>
                            <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{formatMoney(row.net_amount)}</TableCell>
                            <TableCell sx={{ px: 1.5, py: 1 }}>{row.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </Box>
            )}

            {activeTab === "loyalty" && (
              <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", border: "1px solid", borderColor: "divider", overflow: "auto" }}>
                <Table sx={{ width: "100%", "& th, & td": { fontSize: "inherit" } }}>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Date</TableCell>
                      <TableCell sx={{ px: 1.5, py: 1 }}>Type</TableCell>
                      <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Points</TableCell>
                      <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Amount</TableCell>
                      <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Balance After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.loyaltyTransactions || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No loyalty activity yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {(data.loyaltyTransactions || []).map((row) => (
                      <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{formatDate(row.created_at)}</TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>{row.type}</TableCell>
                        <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{row.points}</TableCell>
                        <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{formatMoney(row.amount)}</TableCell>
                        <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{row.balance_after}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default CrmCustomerProfile;
