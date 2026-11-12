import { TYPE } from "@/shared/theme/typeScale";
import PageHeader from "@/shared/components/PageHeader";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid, { createSearchGridAdapter } from "@/shared/hooks/useSearchGrid";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Printer, Save, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { Box, Stack, Typography, Button } from "@mui/material";
import { createGroupFetchers } from "@/shared/utils/serverGrouping";
import CashClosingFields from "./CashClosingFields";
import useCashClosingForm from "./useCashClosingForm";
import { formatCurrency, formatEmployee } from "./cashClosingUtils";

const CashClosing = () => {
  const navigate = useNavigate();
  const form = useCashClosingForm();
  const { saving, loadingMeta } = form;
  const [showSearchPage, setShowSearchPage] = useState(false);
  const searchGrid = useSearchGrid({
    adapter: createSearchGridAdapter("/cash-closings"), enabled: showSearchPage,
    onError: err => toast.error(err.response?.data?.message || "Failed to load records"),
  });
  const loadSearchGrid = searchGrid.load;
  const { rows: searchResults, loading: searching, page: searchPage, setPage: setSearchPage, limit: searchLimit, setLimit: setSearchLimit, pagination: searchPagination } = searchGrid;

  const [searchFilters, setSearchFilters] = useState({
    search: "",
    billNo: "",
    date: "",
    counterId: "",
    receivedByEmployeeId: "",
    cashierEmployeeId: "",
  });
  const searchFiltersRef = useRef(searchFilters);

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  const runSearch = useCallback((override = null) => {
    const filters = override || searchFiltersRef.current;
      const params = {};
      if (String(filters.search || "").trim()) params.search = String(filters.search).trim();
      if (String(filters.billNo || "").trim()) params.billNo = String(filters.billNo).trim();
      if (String(filters.date || "").trim()) params.date = filters.date;
      if (String(filters.counterId || "").trim()) params.counterId = filters.counterId;
      if (String(filters.receivedByEmployeeId || "").trim()) {
        params.receivedByEmployeeId = filters.receivedByEmployeeId;
      }
      if (String(filters.cashierEmployeeId || "").trim()) {
        params.cashierEmployeeId = filters.cashierEmployeeId;
      }

    loadSearchGrid(params);
  }, [loadSearchGrid]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = {
      search: "",
      billNo: "",
      date: "",
      counterId: "",
      receivedByEmployeeId: "",
      cashierEmployeeId: "",
    };
    setSearchFilters(empty);
    await runSearch(empty);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchPage(1);
    setSearchFilters((prev) => {
      const nextFilters = { ...prev, search: query };
      runSearch(nextFilters);
      return nextFilters;
    });
  }, [runSearch, setSearchPage]);

  const cashClosingSearchColumns = useMemo(
    () => [
      {
        key: "bill_no",
        label: "Bill No",
        valueGetter: (row) => row.bill_no || "-",
      },
      {
        key: "closing_at",
        label: "Date / Time",
        valueGetter: (row) => row.closing_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.closing_at ? new Date(row.closing_at).toLocaleString() : ""),
      },
      {
        key: "counter",
        label: "Counter",
        valueGetter: (row) => row.counter?.name || "-",
      },
      {
        key: "received_by",
        label: "Received By",
        valueGetter: (row) => formatEmployee(row.receivedBy),
      },
      {
        key: "cashier",
        label: "Cashier",
        valueGetter: (row) => formatEmployee(row.cashier),
      },
      {
        key: "opening_amount",
        label: "Opening",
        valueGetter: (row) => Number(row.opening_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        valueGetter: (row) => Number(row.closing_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "difference",
        label: "Difference",
        valueGetter: (row) => Number(row.difference || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "counter_expenses",
        label: "Expenses",
        valueGetter: (row) => Number(row.counter_expenses || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "notes",
        label: "Notes",
        valueGetter: (row) => row.notes || "-",
      },
    ],
    []
  );


  const renderEntryPage = () => <CashClosingFields form={form} />;

  const renderSearchPage = () => (
    <SearchGridPanel>
      <FilterableDataTable
        rows={searchResults}
        columns={cashClosingSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No cash closing records found"
        searchPlaceholder="Search in cash closing fields..."
        showExport={false}
        enableColumnResize
        tablePreferenceKey="sales.cash_closing.search"
        onRefresh={runSearch}
        refreshDisabled={searching}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={setSearchPage}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
        }}
        paginationMode="server"
        {...createGroupFetchers("/cash-closings", { counter: "counter_id", cashier: "cashier_employee_id" }, undefined, { inline: true })}
        pagination={searchGrid.rawPagination}
        onNextCursor={searchGrid.navigateCursor}
        onPreviousCursor={searchGrid.navigateCursor}
        fillHeight
      />
    </SearchGridPanel>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", ...(showSearchPage ? { height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : {}) }}>
      <PageHeader
        onBack={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
        backLabel={showSearchPage ? "Back to cash closing entry" : "Back to sales"}
        title={<>
          <Breadcrumbs
            items={[
              { label: "Sales", onClick: () => navigate("/sales") },
              { label: "Cash Closing" },
            ]}
          />
        </>}
        actions={<>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={() => form.handlePrint()}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Printer size={16} style={{marginRight: 4}} />
            Print
          </Button>
          <Button
            onClick={() => form.handleSave()}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-success"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Save size={16} style={{marginRight: 4}} />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Search size={16} style={{marginRight: 4}} />
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
        </>}
      />

      <Stack spacing={2} sx={showSearchPage ? masterSearchAreaSx : { p: 2, pb: 7 }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loadingMeta && <Typography sx={{ fontSize: TYPE.small, color: "text.secondary", px: 0.5 }}>Loading options...</Typography>}
      </Stack>
    </Box>
  );
};

export default CashClosing;
