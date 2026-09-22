import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import Breadcrumbs from "../../components/Breadcrumbs";

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
    <Box className="master-responsive" sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default", color: "text.primary", fontSize: 11 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 13, fontWeight: 600 }}
            items={[
              { label: "CRM", onClick: () => navigate("/crm") },
              { label: "Loyalty Management" },
            ]}
          />
        </Stack>
        {activeTab === "balances" && (
          <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
            Total points across customers: <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{totalPoints}</Box>
          </Typography>
        )}
      </Stack>

      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, p: 2 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
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
          {activeTab === "balances" && (
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or loyalty card..."
              sx={{ width: 256, "& .MuiInputBase-input": { fontSize: "inherit" } }}
            />
          )}
        </Stack>

        <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", border: "1px solid", borderColor: "divider", flex: 1, overflow: "auto" }}>
          {loading ? (
            <Typography sx={{ textAlign: "center", py: 4, fontSize: "inherit", color: "text.secondary" }}>Loading...</Typography>
          ) : activeTab === "balances" ? (
            <Table sx={{ width: "100%", "& th, & td": { fontSize: "inherit" } }}>
              <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                <TableRow>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Name</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Phone</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Loyalty Card</TableCell>
                  <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Points</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Loyalty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
                {balances.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{ borderTop: "1px solid", borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                    onClick={() => navigate(`/crm/customer/${row.id}/profile`)}
                  >
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.name}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.phone || "--"}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.loyalty_card_number || "--"}</TableCell>
                    <TableCell align="right" sx={{ px: 1.5, py: 1, fontWeight: 600 }}>{row.loyalty_points}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>
                      {row.disable_loyalty ? (
                        <Box component="span" sx={{ color: "text.disabled" }}>Disabled</Box>
                      ) : (
                        <Box component="span" sx={{ color: "success.main" }}>Active</Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table sx={{ width: "100%", "& th, & td": { fontSize: "inherit" } }}>
              <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                <TableRow>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Date</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Customer</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Type</TableCell>
                  <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Points</TableCell>
                  <TableCell align="right" sx={{ px: 1.5, py: 1 }}>Amount</TableCell>
                  <TableCell sx={{ px: 1.5, py: 1 }}>Sale Invoice</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No loyalty transactions yet.
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((row) => (
                  <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{formatDate(row.created_at)}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.customer?.name || "--"}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.type}</TableCell>
                    <TableCell align="right" sx={{ px: 1.5, py: 1 }}>{row.points}</TableCell>
                    <TableCell align="right" sx={{ px: 1.5, py: 1 }}>₹{toNum(row.amount, 0).toFixed(2)}</TableCell>
                    <TableCell sx={{ px: 1.5, py: 1 }}>{row.pos_sale?.invoice_no || "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default CrmLoyaltyManagement;
