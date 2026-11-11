import React, { Suspense, lazy } from "react";
import { matchRoutes, Navigate, Route, Routes, useLocation } from "react-router-dom";
import PageSkeleton from "@/shared/components/PageSkeleton";
import ChunkErrorBoundary from "@/shared/components/ChunkErrorBoundary";

const RouteLoadingFallback = () => <PageSkeleton variant="form" rows={8} />;

// HRMS moved out from under /masters/* into its own module -- this keeps old
// bookmarks/links (including deep links carrying ?type=&id=) working instead
// of dropping the visitor on a blank/broken page.
const RedirectPreservingQuery = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const ComingSoon = lazy(() => import("@/shared/components/ComingSoon"));
const ModulePage = lazy(() => import("@/shared/components/ModulePage"));
const Profile = lazy(() => import("@/features/auth/Profile"));
const Notifications = lazy(() => import("@/features/notifications/Notifications"));
const StoreActivation = lazy(() => import("@/features/activation/StoreActivation"));
const Brand = lazy(() => import("@/features/masters/Brand"));
const Tax = lazy(() => import("@/features/masters/Tax"));
const TaxForm = lazy(() => import("@/features/masters/TaxForm"));
const Transport = lazy(() => import("@/features/masters/Transport"));
const TransportForm = lazy(() => import("@/features/masters/TransportForm"));
const Supplier = lazy(() => import("@/features/masters/Supplier"));
const Agent = lazy(() => import("@/features/masters/Agent"));
const Employee = lazy(() => import("@/features/hr/Employee"));
const Configuration = lazy(() => import("@/features/masters/Configuration"));
const ConfigurationForm = lazy(() => import("@/features/masters/ConfigurationForm"));
const HrConfiguration = lazy(() => import("@/features/hr/HrConfiguration"));
const HrConfigurationForm = lazy(() => import("@/features/hr/HrConfigurationForm"));
const EmployeeInOut = lazy(() => import("@/features/hr/attendance/EmployeeInOut"));
const LeavePage = lazy(() => import("@/features/hr/leave/LeavePage"));
const SalaryManagement = lazy(() => import("@/features/hr/payroll/SalaryManagement"));
const MyPayslips = lazy(() => import("@/features/hr/payroll/MyPayslips"));
const HrDashboard = lazy(() => import("@/features/hr/dashboard/HrDashboard"));
const ShiftRoster = lazy(() => import("@/features/hr/roster/ShiftRoster"));
const OtApprovals = lazy(() => import("@/features/hr/requests/OtApprovals"));
const Movements = lazy(() => import("@/features/hr/requests/Movements"));
const MyRequests = lazy(() => import("@/features/hr/requests/StaffRequests").then((m) => ({ default: m.MyRequests })));
const RequestApprovals = lazy(() => import("@/features/hr/requests/StaffRequests").then((m) => ({ default: m.RequestApprovals })));
const MyClaims = lazy(() => import("@/features/hr/money/StaffMoney").then((m) => ({ default: m.MyClaims })));
const ExpenseClaims = lazy(() => import("@/features/hr/money/StaffMoney").then((m) => ({ default: m.ExpenseClaims })));
const StaffLoans = lazy(() => import("@/features/hr/money/StaffMoney").then((m) => ({ default: m.StaffLoans })));
const LeaveEncashment = lazy(() => import("@/features/hr/money/StaffMoney").then((m) => ({ default: m.LeaveEncashment })));
const MyResignation = lazy(() => import("@/features/hr/exits/Exits").then((m) => ({ default: m.MyResignation })));
const Exits = lazy(() => import("@/features/hr/exits/Exits").then((m) => ({ default: m.Exits })));
const FinalSettlements = lazy(() => import("@/features/hr/exits/Exits").then((m) => ({ default: m.FinalSettlements })));
const MyTax = lazy(() => import("@/features/hr/tax/Tax").then((m) => ({ default: m.MyTax })));
const IncomeTax = lazy(() => import("@/features/hr/tax/Tax").then((m) => ({ default: m.IncomeTax })));
const StaffAppSetup = lazy(() => import("@/features/hr/staffApp/StaffAppSetup"));
const AttendanceRegisterPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.AttendanceRegisterPage })));
const PunchLogPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.PunchLogPage })));
const HolidaysPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.HolidaysPage })));
const LeaveApprovalsPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.LeaveApprovalsPage })));
const LeaveApplicationsPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.LeaveApplicationsPage })));
const LeaveBalancesPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.LeaveBalancesPage })));
const LeaveSetupPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.LeaveSetupPage })));
const AdditionalPayPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.AdditionalPayPage })));
const SalaryStructuresPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.SalaryStructuresPage })));
const PayrollSettingsPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.PayrollSettingsPage })));
const PayrollReportsPage = lazy(() => import("@/features/hr/HrSectionPages").then((m) => ({ default: m.PayrollReportsPage })));
const Product = lazy(() => import("@/features/masters/Product"));
const ProductForm = lazy(() => import("@/features/masters/ProductForm"));
const Item = lazy(() => import("@/features/masters/Item"));
const ProductAttributes = lazy(() => import("@/features/masters/ProductAttributes"));
const ProductAttributeForm = lazy(() => import("@/features/masters/ProductAttributeForm"));
const CompanySettings = lazy(() => import("@/features/settings/Company"));
const Themes = lazy(() => import("@/features/settings/Themes"));
const ConfigureLocalServer = lazy(() => import("@/features/settings/ConfigureLocalServer"));
const PrintingConfiguration = lazy(() => import("@/features/settings/PrintingConfiguration"));
const BackupCenter = lazy(() => import("@/features/settings/BackupCenter"));
const RemoteSupport = lazy(() => import("@/features/settings/RemoteSupport"));
const UserAccess = lazy(() => import("@/features/settings/users/UserAccess"));
const UserAccessHome = lazy(() => import("@/features/settings/users/UserAccessHome"));
const WarehouseDashboard = lazy(() => import("@/features/warehouse/WarehouseDashboard"));
const PurchaseInvoiceImport = lazy(() => import("@/features/warehouse/purchase-invoice/PurchaseInvoiceImport"));
const TransportEntry = lazy(() => import("@/features/warehouse/transport/TransportEntry"));
const TransportEntrySearch = lazy(() => import("@/features/warehouse/transport/TransportEntrySearch"));
const Intray = lazy(() => import("@/features/warehouse/inventory/Intray"));
const PurchaseInvoiceEntry = lazy(() => import("@/features/warehouse/purchase-invoice/PurchaseInvoiceEntry"));
const PurchaseInvoiceSearch = lazy(() => import("@/features/warehouse/purchase-invoice/PurchaseInvoiceSearch"));
const InventoryEntry = lazy(() => import("@/features/warehouse/inventory/InventoryEntry"));
const InventoryEntrySearch = lazy(() => import("@/features/warehouse/inventory/InventoryEntrySearch"));
const BarcodeGeneration = lazy(() => import("@/features/warehouse/barcodes/BarcodeGeneration"));
const BarcodeSearch = lazy(() => import("@/features/warehouse/barcodes/BarcodeSearch"));
const BarcodeCustomisation = lazy(() => import("@/features/warehouse/barcodes/BarcodeCustomisation"));
const TransportIssueEntry = lazy(() => import("@/features/warehouse/transport/TransportIssueEntry"));
const TransportIssueSearch = lazy(() => import("@/features/warehouse/transport/TransportIssueSearch"));
const TransportReceiptEntry = lazy(() => import("@/features/warehouse/transport/TransportReceiptEntry"));
const StockOutward = lazy(() => import("@/features/warehouse/stock/StockOutward"));
const StoreTransfers = lazy(() => import("@/features/store/StoreTransfers"));
const PurchaseOrders = lazy(() => import("@/features/store/PurchaseOrders"));
const ReorderStatus = lazy(() => import("@/features/analytical/ReorderStatus"));
const ReceiveGoods = lazy(() => import("@/features/warehouse/inventory/ReceiveGoods"));
const PhysicalStock = lazy(() => import("@/features/warehouse/stock/PhysicalStock"));
const PurchaseReturnEntry = lazy(() => import("@/features/warehouse/purchase-return/PurchaseReturnEntry"));
const PurchaseReturnSearch = lazy(() => import("@/features/warehouse/purchase-return/PurchaseReturnSearch"));
const DirectPurchaseEntry = lazy(() => import("@/features/warehouse/direct-purchase/DirectPurchaseEntry"));
const DirectPurchaseSearch = lazy(() => import("@/features/warehouse/direct-purchase/DirectPurchaseSearch"));
const ItemLocator = lazy(() => import("@/features/warehouse/stock/ItemLocator"));
const WarehouseReports = lazy(() => import("@/features/warehouse/WarehouseReports"));
const CustomerList = lazy(() => import("@/features/crm/CustomerList"));
const CustomerForm = lazy(() => import("@/features/crm/CustomerForm"));
const CustomerProfile = lazy(() => import("@/features/crm/CustomerProfile"));
const CustomerOrderList = lazy(() => import("@/features/crm/CustomerOrderList"));
const CustomerOrderForm = lazy(() => import("@/features/crm/CustomerOrderForm"));
const BillPrint = lazy(() => import("@/features/crm/BillPrint"));
const LoyaltyManagement = lazy(() => import("@/features/crm/LoyaltyManagement"));
const PosSales = lazy(() => import("@/features/sales/pos/PosSales"));
const PosReturn = lazy(() => import("@/features/sales/pos/PosReturn"));
const DealerInvoice = lazy(() => import("@/features/sales/dealer/DealerInvoice"));
const DealerInvoiceReturn = lazy(() => import("@/features/sales/dealer/DealerInvoiceReturn"));
const SalesOnApproval = lazy(() => import("@/features/sales/approvals/SalesOnApproval"));
const ApprovalInbox = lazy(() => import("@/features/sales/approvals/ApprovalInbox"));
const Approvals = lazy(() => import("@/features/sales/approvals/Approvals"));
const OfflineBills = lazy(() => import("@/features/sales/pos/offline/OfflineBills"));
const Settlement = lazy(() => import("@/features/sales/settlement/Settlement"));
const SalesReports = lazy(() => import("@/features/sales/reports/SalesReports"));
const TouchSales = lazy(() => import("@/features/sales/pos/TouchSales"));
const CashOpening = lazy(() => import("@/features/sales/settlement/CashOpening"));
const CashClosing = lazy(() => import("@/features/sales/settlement/CashClosing"));
const LegacyPos = lazy(() => import("@/features/sales/pos/LegacyPos"));
const SalesCustomisation = lazy(() => import("@/features/sales/customisation/SalesCustomisation"));
const ReceiptFormatsDesigner = lazy(() => import("@/features/sales/customisation/ReceiptFormatsDesigner"));
const StockAnalyzer = lazy(() => import("@/features/analytical/StockAnalyzer"));
const SalesComparer = lazy(() => import("@/features/analytical/SalesComparer"));
const SalesVsPurchase = lazy(() => import("@/features/analytical/SalesVsPurchase"));
const SalesVsStock = lazy(() => import("@/features/analytical/SalesVsStock"));
const SupplierProductAnalyzer = lazy(() => import("@/features/analytical/SupplierProductAnalyzer"));
const SalesPivotAnalyzer = lazy(() => import("@/features/analytical/SalesPivotAnalyzer"));
const StockValuationAnalyzer = lazy(() => import("@/features/analytical/StockValuationAnalyzer"));
const SupplierPayment = lazy(() => import("@/features/finance/SupplierPayment"));
const ManageLedger = lazy(() => import("@/features/finance/accounting/ManageLedger"));
const VoucherEntry = lazy(() => import("@/features/finance/accounting/VoucherEntry"));
const Daybook = lazy(() => import("@/features/finance/accounting/Daybook"));
const Outstanding = lazy(() => import("@/features/finance/accounting/Outstanding"));
const TrialBalance = lazy(() => import("@/features/finance/accounting/TrialBalance"));
const FinalAccounts = lazy(() => import("@/features/finance/accounting/FinalAccounts"));

export const protectedLayoutRoutes = [
  { path: "/masters/brand", render: () => <Brand key="list" /> },
  { path: "/masters/brand/new", render: () => <Brand key="create" initialCreate /> },
  { path: "/masters/tax", render: () => <Tax /> },
  { path: "/masters/tax/new", render: () => <TaxForm /> },
  { path: "/masters/tax/:taxCode", render: () => <TaxForm /> },
  { path: "/masters/tax/edit/:taxCode", render: () => <TaxForm /> },
  { path: "/masters/transport", render: () => <Transport /> },
  { path: "/masters/transport/new", render: () => <TransportForm /> },
  { path: "/masters/transport/:id", render: () => <TransportForm /> },
  { path: "/masters/transport/edit/:id", render: () => <TransportForm /> },
  { path: "/masters/supplier", render: () => <Supplier key="list" /> },
  { path: "/masters/supplier/new", render: () => <Supplier key="create" initialCreate /> },
  { path: "/masters/agent", render: () => <Agent /> },
  { path: "/masters/configuration", render: () => <Configuration /> },
  { path: "/masters/configuration/new", render: () => <ConfigurationForm /> },
  { path: "/hrms/employee", render: () => <Employee /> },
  { path: "/hrms/hr-configuration", render: () => <HrConfiguration /> },
  { path: "/hrms/hr-configuration/new", render: () => <HrConfigurationForm /> },
  { path: "/hrms/employee-in-out", render: () => <EmployeeInOut /> },
  { path: "/hrms/leave", render: () => <LeavePage /> },
  { path: "/hrms/salary-management", render: () => <SalaryManagement /> },
  { path: "/hrms/my-payslips", render: () => <MyPayslips /> },
  { path: "/hrms/dashboard", render: () => <HrDashboard /> },
  { path: "/hrms/shift-roster", render: () => <ShiftRoster /> },
  { path: "/hrms/ot-approvals", render: () => <OtApprovals /> },
  { path: "/hrms/my-requests", render: () => <MyRequests /> },
  { path: "/hrms/request-approvals", render: () => <RequestApprovals /> },
  { path: "/hrms/movements", render: () => <Movements /> },
  { path: "/hrms/my-claims", render: () => <MyClaims /> },
  { path: "/hrms/expense-claims", render: () => <ExpenseClaims /> },
  { path: "/hrms/loans", render: () => <StaffLoans /> },
  { path: "/hrms/leave-encashment", render: () => <LeaveEncashment /> },
  { path: "/hrms/my-resignation", render: () => <MyResignation /> },
  { path: "/hrms/exits", render: () => <Exits /> },
  { path: "/hrms/settlements", render: () => <FinalSettlements /> },
  { path: "/hrms/my-tax", render: () => <MyTax /> },
  { path: "/hrms/income-tax", render: () => <IncomeTax /> },
  { path: "/hrms/staff-app", render: () => <StaffAppSetup /> },
  { path: "/hrms/attendance-register", render: () => <AttendanceRegisterPage /> },
  { path: "/hrms/punch-log", render: () => <PunchLogPage /> },
  { path: "/hrms/holidays", render: () => <HolidaysPage /> },
  { path: "/hrms/leave-approvals", render: () => <LeaveApprovalsPage /> },
  { path: "/hrms/leave-applications", render: () => <LeaveApplicationsPage /> },
  { path: "/hrms/leave-balances", render: () => <LeaveBalancesPage /> },
  { path: "/hrms/leave-setup", render: () => <LeaveSetupPage /> },
  { path: "/hrms/additional-pay", render: () => <AdditionalPayPage /> },
  { path: "/hrms/salary-structures", render: () => <SalaryStructuresPage /> },
  { path: "/hrms/payroll-settings", render: () => <PayrollSettingsPage /> },
  { path: "/hrms/payroll-reports", render: () => <PayrollReportsPage /> },
  { path: "/masters/employee", render: () => <RedirectPreservingQuery to="/hrms/employee" /> },
  { path: "/masters/hr-configuration", render: () => <RedirectPreservingQuery to="/hrms/hr-configuration" /> },
  { path: "/masters/hr-configuration/new", render: () => <RedirectPreservingQuery to="/hrms/hr-configuration/new" /> },
  { path: "/masters/product", render: () => <Product /> },
  { path: "/masters/product/new", render: () => <ProductForm /> },
  { path: "/masters/product/:code", render: () => <ProductForm /> },
  { path: "/masters/item", render: () => <Item /> },
  { path: "/masters/product-attributes", render: () => <ProductAttributes /> },
  { path: "/masters/product-attributes/new", render: () => <ProductAttributeForm /> },
  { path: "/profile", render: () => <Profile /> },
  { path: "/notifications", render: () => <Notifications /> },
  { path: "/store-activation", render: () => <StoreActivation /> },
  { path: "/dashboard", render: () => <Dashboard /> },
  { path: "/settings/company", render: () => <CompanySettings /> },
  { path: "/settings/themes", render: () => <Themes /> },
  // Renamed from Branding -- keeps old bookmarks/links working, same pattern as the HRMS move above.
  { path: "/settings/branding", render: () => <RedirectPreservingQuery to="/settings/themes" /> },
  { path: "/settings/configure-local-server", render: () => <ConfigureLocalServer /> },
  { path: "/settings/printing-configuration", render: () => <PrintingConfiguration /> },
  { path: "/settings/backup", render: () => <BackupCenter /> },
  { path: "/settings/remote-support", render: () => <RemoteSupport /> },
  { path: "/remote-support", render: () => <RemoteSupport /> },
  { path: "/user-access", render: () => <UserAccessHome /> },
  { path: "/user-access/:entity", render: () => <UserAccess /> },
  { path: "/user-access/:entity/create", render: () => <UserAccess /> },
  { path: "/user-access/:entity/:id/edit", render: () => <UserAccess /> },
  { path: "/settings/user-access", render: () => <Navigate to="/user-access" replace /> },
  { path: "/:moduleName", render: () => <ModulePage /> },
  { path: "/warehouse/dashboard", render: () => <WarehouseDashboard /> },
  { path: "/warehouse/new-page", render: () => <PurchaseInvoiceImport /> },
  { path: "/warehouse/courier", render: () => <ComingSoon /> },
  { path: "/warehouse/transport-entry", render: () => <TransportEntry /> },
  { path: "/warehouse/transport-entry/search", render: () => <TransportEntrySearch /> },
  { path: "/warehouse/intray", render: () => <Intray /> },
  { path: "/warehouse/invoice", render: () => <PurchaseInvoiceEntry /> },
  { path: "/warehouse/invoice/search", render: () => <PurchaseInvoiceSearch /> },
  { path: "/warehouse/inventory-entry", render: () => <InventoryEntry /> },
  { path: "/warehouse/inventory-entry/search", render: () => <InventoryEntrySearch /> },
  { path: "/warehouse/barcode", render: () => <BarcodeGeneration /> },
  { path: "/warehouse/customisation", render: () => <BarcodeCustomisation /> },
  { path: "/warehouse/customization", render: () => <BarcodeCustomisation /> },
  { path: "/warehouse/barcode/search", render: () => <BarcodeSearch /> },
  { path: "/warehouse/transport-issue", render: () => <TransportIssueEntry /> },
  { path: "/warehouse/transport-issue/search", render: () => <TransportIssueSearch /> },
  { path: "/warehouse/transport-receipt", render: () => <TransportReceiptEntry /> },
  { path: "/warehouse/stock-outward", render: () => <StockOutward /> },
  { path: "/warehouse/stock-outward/search", render: () => <StoreTransfers mode="all" /> },
  { path: "/store/transfer-goods", render: () => <StoreTransfers mode="all" /> },
  { path: "/store/stock-inward", render: () => <StoreTransfers mode="incoming" /> },
  { path: "/store/purchase-order", render: () => <PurchaseOrders /> },
  { path: "/analytical/reorder-status", render: () => <ReorderStatus /> },
  { path: "/warehouse/receive-goods", render: () => <ReceiveGoods /> },
  { path: "/warehouse/physical-stock", render: () => <PhysicalStock /> },
  { path: "/warehouse/purchase-return", render: () => <PurchaseReturnEntry /> },
  { path: "/warehouse/purchase-return/search", render: () => <PurchaseReturnSearch /> },
  { path: "/warehouse/direct-purchase", render: () => <DirectPurchaseEntry /> },
  { path: "/warehouse/direct-purchase/search", render: () => <DirectPurchaseSearch /> },
  { path: "/warehouse/stock-item", render: () => <ItemLocator /> },
  { path: "/warehouse/reports", render: () => <WarehouseReports /> },
  { path: "/crm/customer", render: () => <CustomerList /> },
  { path: "/crm/customer/new", render: () => <CustomerForm /> },
  { path: "/crm/customer/:id", render: () => <CustomerForm /> },
  { path: "/crm/customer/:id/profile", render: () => <CustomerProfile /> },
  { path: "/crm/customer-orders", render: () => <CustomerOrderList /> },
  { path: "/crm/customer-orders/new", render: () => <CustomerOrderForm /> },
  { path: "/crm/customer-orders/:id", render: () => <CustomerOrderForm /> },
  { path: "/crm/bill-print", render: () => <BillPrint /> },
  { path: "/crm/loyalty-management", render: () => <LoyaltyManagement /> },
  { path: "/sales/pos-sales", render: () => <PosSales /> },
  { path: "/sales/pos-sales-return", render: () => <PosReturn /> },
  { path: "/sales/dealer-invoice", render: () => <DealerInvoice /> },
  { path: "/sales/dealer-invoice-return", render: () => <DealerInvoiceReturn /> },
  { path: "/sales/sales-on-approval", render: () => <SalesOnApproval /> },
  { path: "/sales/approval-inbox", render: () => <ApprovalInbox /> },
  { path: "/sales/approvals", render: () => <Approvals /> },
  { path: "/sales/offline-bills", render: () => <OfflineBills /> },
  { path: "/sales/settlement", render: () => <Settlement /> },
  { path: "/sales/reports", render: () => <SalesReports /> },
  { path: "/sales/touch-sales", render: () => <TouchSales /> },
  { path: "/sales/cash-opening", render: () => <CashOpening /> },
  { path: "/sales/cash-closing", render: () => <CashClosing /> },
  { path: "/sales/pos-old", render: () => <LegacyPos /> },
  { path: "/sales/customisation", render: () => <SalesCustomisation /> },
  { path: "/sales/customization", render: () => <SalesCustomisation /> },
  { path: "/sales/receipt-formats", render: () => <ReceiptFormatsDesigner /> },
  { path: "/sales/receipt-a4-formats", render: () => <ReceiptFormatsDesigner /> },
  { path: "/analytical/stock-analyzer", render: () => <StockAnalyzer /> },
  { path: "/analytical/sales-comparer", render: () => <SalesComparer /> },
  { path: "/analytical/sales-vs-purchase", render: () => <SalesVsPurchase /> },
  { path: "/analytical/sales-vs-stock", render: () => <SalesVsStock /> },
  { path: "/analytical/purchase-analyzer", render: () => <SupplierProductAnalyzer /> },
  { path: "/analytical/sales-analyzer", render: () => <SalesPivotAnalyzer /> },
  { path: "/analytical/stock-marker-analyzer", render: () => <StockValuationAnalyzer /> },
  { path: "/finance/supplier-payment", render: () => <SupplierPayment /> },
  { path: "/finance/manage-ledger", render: () => <ManageLedger /> },
  { path: "/finance/voucher-entry", render: () => <VoucherEntry /> },
  { path: "/finance/daybook", render: () => <Daybook /> },
  { path: "/finance/payable", render: () => <Outstanding key="payable" side="payable" /> },
  { path: "/finance/receivable", render: () => <Outstanding key="receivable" side="receivable" /> },
  { path: "/finance/trial-balance", render: () => <TrialBalance /> },
  { path: "/finance/trading-account", render: () => <FinalAccounts key="trading" variant="trading" /> },
  { path: "/finance/p-l-account", render: () => <FinalAccounts key="pl" variant="pl" /> },
  { path: "/finance/balance-sheet", render: () => <FinalAccounts key="balance" variant="balance" /> },
];

export const isRegisteredProtectedPath = (pathname) =>
  Boolean(matchRoutes(protectedLayoutRoutes, String(pathname || "")));

export const renderProtectedLayoutRouteElements = () =>
  protectedLayoutRoutes.map((route) => (
    <Route key={route.path} path={route.path} element={route.render()} />
  ));

export const ProtectedLayoutRouteRenderer = ({ location }) => (
  <ChunkErrorBoundary>
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes location={location}>
        {renderProtectedLayoutRouteElements()}
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </Suspense>
  </ChunkErrorBoundary>
);
