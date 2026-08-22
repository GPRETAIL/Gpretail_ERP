import React, { Suspense, lazy } from "react";
import { matchRoutes, Navigate, Route, Routes } from "react-router-dom";
import PageSkeleton from "../components/PageSkeleton";

const RouteLoadingFallback = () => <PageSkeleton variant="form" rows={8} />;

const Dashboard = lazy(() => import("../pages/Dashboard"));
const ComingSoon = lazy(() => import("../pages/ComingSoon"));
const ModulePage = lazy(() => import("../pages/ModulePage"));
const Profile = lazy(() => import("../pages/Profile"));
const Brand = lazy(() => import("../pages/master/Brand"));
const Tax = lazy(() => import("../pages/master/Tax"));
const TaxForm = lazy(() => import("../pages/master/TaxForm"));
const Transport = lazy(() => import("../pages/master/Transport"));
const TransportForm = lazy(() => import("../pages/master/TransportForm"));
const Supplier = lazy(() => import("../pages/master/Supplier"));
const Agent = lazy(() => import("../pages/master/Agent"));
const Employee = lazy(() => import("../pages/master/Employee"));
const Configuration = lazy(() => import("../pages/master/Configuration"));
const ConfigurationForm = lazy(() => import("../pages/master/ConfigurationForm"));
const HrConfiguration = lazy(() => import("../pages/master/HrConfiguration"));
const HrConfigurationForm = lazy(() => import("../pages/master/HrConfigurationForm"));
const Product = lazy(() => import("../pages/master/Product"));
const ProductForm = lazy(() => import("../pages/master/ProductForm"));
const Item = lazy(() => import("../pages/master/Item"));
const ProductAttributes = lazy(() => import("../pages/master/ProductAttributes"));
const AddAttributePage = lazy(() => import("../pages/master/AddAttributePage"));
const CompanySettings = lazy(() => import("../pages/settings/Company"));
const Branding = lazy(() => import("../pages/settings/Branding"));
const ConfigureLocalServer = lazy(() => import("../pages/settings/ConfigureLocalServer"));
const PrintingConfiguration = lazy(() => import("../pages/settings/PrintingConfiguration"));
const BackupCenter = lazy(() => import("../pages/settings/BackupCenter"));
const UserAccess = lazy(() => import("../pages/settings/UserAccess"));
const UserAccessHome = lazy(() => import("../pages/settings/UserAccessHome"));
const WarehouseDashboard = lazy(() => import("../pages/warehouse/WarehouseDashboard"));
const WarehouseNewPage = lazy(() => import("../pages/warehouse/NewPage"));
const TransportEntry = lazy(() => import("../pages/warehouse/TransportEntry"));
const TransportEntrySearchPage = lazy(() => import("../pages/warehouse/TransportEntrySearchPage"));
const Intray = lazy(() => import("../pages/warehouse/Intray"));
const InvoiceEntry = lazy(() => import("../pages/warehouse/InvoiceEntry"));
const InvoiceSearchPage = lazy(() => import("../pages/warehouse/InvoiceSearchPage"));
const InventoryEntry = lazy(() => import("../pages/warehouse/InventoryEntry"));
const InventoryEntrySearchPage = lazy(() => import("../pages/warehouse/InventoryEntrySearchPage"));
const BarcodeGeneration = lazy(() => import("../pages/warehouse/BarcodeGeneration"));
const BarcodeSearchPage = lazy(() => import("../pages/warehouse/BarcodeSearchPage"));
const WarehouseCustomisation = lazy(() => import("../pages/warehouse/Customisation"));
const TransportIssueEntry = lazy(() => import("../pages/warehouse/TransportIssueEntry"));
const TransportIssueSearchPage = lazy(() => import("../pages/warehouse/TransportIssueSearchPage"));
const TransportReceipt = lazy(() => import("../pages/warehouse/TransportReceipt"));
const StockOutward = lazy(() => import("../pages/warehouse/StockOutward"));
const StockOutwardSearchPage = lazy(() => import("../pages/warehouse/StockOutwardSearchPage"));
const ReceiveGoods = lazy(() => import("../pages/warehouse/ReceiveGoods"));
const PhysicalStock = lazy(() => import("../pages/warehouse/PhysicalStock"));
const PurchaseReturn = lazy(() => import("../pages/warehouse/PurchaseReturn"));
const PurchaseReturnSearchPage = lazy(() => import("../pages/warehouse/PurchaseReturnSearchPage"));
const DirectPurchase = lazy(() => import("../pages/warehouse/DirectPurchase"));
const DirectPurchaseSearchPage = lazy(() => import("../pages/warehouse/DirectPurchaseSearchPage"));
const ItemLocator = lazy(() => import("../pages/warehouse/ItemLocator"));
const WarehouseReports = lazy(() => import("../pages/warehouse/WarehouseReports"));
const CrmCustomer = lazy(() => import("../pages/crm/CrmCustomer"));
const CrmCustomerForm = lazy(() => import("../pages/crm/CrmCustomerForm"));
const CrmCustomerProfile = lazy(() => import("../pages/crm/CrmCustomerProfile"));
const CrmCustomerOrders = lazy(() => import("../pages/crm/CrmCustomerOrders"));
const CrmCustomerOrderForm = lazy(() => import("../pages/crm/CrmCustomerOrderForm"));
const CrmBillPrint = lazy(() => import("../pages/crm/CrmBillPrint"));
const CrmLoyaltyManagement = lazy(() => import("../pages/crm/CrmLoyaltyManagement"));
const POSSales = lazy(() => import("../pages/sales/POSSales"));
const POSReturn = lazy(() => import("../pages/sales/POSReturn"));
const DealerInvoice = lazy(() => import("../pages/sales/DealerInvoice"));
const DealerInvoiceReturn = lazy(() => import("../pages/sales/DealerInvoiceReturn"));
const SalesOnApproval = lazy(() => import("../pages/sales/SalesOnApproval"));
const ApprovalInbox = lazy(() => import("../pages/sales/ApprovalInbox"));
const Settlement = lazy(() => import("../pages/sales/Settlement"));
const SalesReports = lazy(() => import("../pages/sales/SalesReports"));
const TouchSales = lazy(() => import("../pages/sales/TouchSales"));
const CashOpening = lazy(() => import("../pages/sales/CashOpening"));
const CashClosing = lazy(() => import("../pages/sales/CashClosing"));
const POSOld = lazy(() => import("../pages/sales/POSOld"));
const Customisation = lazy(() => import("../pages/sales/Customisation"));
const StockAnalyzer = lazy(() => import("../pages/analytical/StockAnalyzer"));
const SalesComparer = lazy(() => import("../pages/analytical/SalesComparer"));
const SalesVsPurchase = lazy(() => import("../pages/analytical/SalesVsPurchase"));
const SalesVsStock = lazy(() => import("../pages/analytical/SalesVsStock"));
const SupplierPayment = lazy(() => import("../pages/finance/SupplierPayment"));

export const protectedLayoutRoutes = [
  { path: "/masters/brand", render: () => <Brand /> },
  { path: "/masters/tax", render: () => <Tax /> },
  { path: "/masters/tax/new", render: () => <TaxForm /> },
  { path: "/masters/tax/:taxCode", render: () => <TaxForm /> },
  { path: "/masters/tax/edit/:taxCode", render: () => <TaxForm /> },
  { path: "/masters/transport", render: () => <Transport /> },
  { path: "/masters/transport/new", render: () => <TransportForm /> },
  { path: "/masters/transport/:id", render: () => <TransportForm /> },
  { path: "/masters/transport/edit/:id", render: () => <TransportForm /> },
  { path: "/masters/supplier", render: () => <Supplier /> },
  { path: "/masters/agent", render: () => <Agent /> },
  { path: "/masters/employee", render: () => <Employee /> },
  { path: "/masters/configuration", render: () => <Configuration /> },
  { path: "/masters/configuration/new", render: () => <ConfigurationForm /> },
  { path: "/masters/hr-configuration", render: () => <HrConfiguration /> },
  { path: "/masters/hr-configuration/new", render: () => <HrConfigurationForm /> },
  { path: "/masters/product", render: () => <Product /> },
  { path: "/masters/product/new", render: () => <ProductForm /> },
  { path: "/masters/product/:code", render: () => <ProductForm /> },
  { path: "/masters/item", render: () => <Item /> },
  { path: "/masters/product-attributes", render: () => <ProductAttributes /> },
  { path: "/masters/product-attributes/new", render: () => <AddAttributePage /> },
  { path: "/profile", render: () => <Profile /> },
  { path: "/dashboard", render: () => <Dashboard /> },
  { path: "/settings/company", render: () => <CompanySettings /> },
  { path: "/settings/branding", render: () => <Branding /> },
  { path: "/settings/configure-local-server", render: () => <ConfigureLocalServer /> },
  { path: "/settings/printing-configuration", render: () => <PrintingConfiguration /> },
  { path: "/settings/backup", render: () => <BackupCenter /> },
  { path: "/user-access", render: () => <UserAccessHome /> },
  { path: "/user-access/:entity", render: () => <UserAccess /> },
  { path: "/user-access/:entity/create", render: () => <UserAccess /> },
  { path: "/user-access/:entity/:id/edit", render: () => <UserAccess /> },
  { path: "/settings/user-access", render: () => <Navigate to="/user-access" replace /> },
  { path: "/:moduleName", render: () => <ModulePage /> },
  { path: "/warehouse/dashboard", render: () => <WarehouseDashboard /> },
  { path: "/warehouse/new-page", render: () => <WarehouseNewPage /> },
  { path: "/warehouse/courier", render: () => <h1>/warehouse/courier</h1> },
  { path: "/warehouse/transport-entry", render: () => <TransportEntry /> },
  { path: "/warehouse/transport-entry/search", render: () => <TransportEntrySearchPage /> },
  { path: "/warehouse/intray", render: () => <Intray /> },
  { path: "/warehouse/invoice", render: () => <InvoiceEntry /> },
  { path: "/warehouse/invoice/search", render: () => <InvoiceSearchPage /> },
  { path: "/warehouse/inventory-entry", render: () => <InventoryEntry /> },
  { path: "/warehouse/inventory-entry/search", render: () => <InventoryEntrySearchPage /> },
  { path: "/warehouse/barcode", render: () => <BarcodeGeneration /> },
  { path: "/warehouse/customisation", render: () => <WarehouseCustomisation /> },
  { path: "/warehouse/customization", render: () => <WarehouseCustomisation /> },
  { path: "/warehouse/barcode/search", render: () => <BarcodeSearchPage /> },
  { path: "/warehouse/transport-issue", render: () => <TransportIssueEntry /> },
  { path: "/warehouse/transport-issue/search", render: () => <TransportIssueSearchPage /> },
  { path: "/warehouse/transport-receipt", render: () => <TransportReceipt /> },
  { path: "/warehouse/stock-outward", render: () => <StockOutward /> },
  { path: "/warehouse/stock-outward/search", render: () => <StockOutwardSearchPage /> },
  { path: "/warehouse/receive-goods", render: () => <ReceiveGoods /> },
  { path: "/warehouse/physical-stock", render: () => <PhysicalStock /> },
  { path: "/warehouse/purchase-return", render: () => <PurchaseReturn /> },
  { path: "/warehouse/purchase-return/search", render: () => <PurchaseReturnSearchPage /> },
  { path: "/warehouse/direct-purchase", render: () => <DirectPurchase /> },
  { path: "/warehouse/direct-purchase/search", render: () => <DirectPurchaseSearchPage /> },
  { path: "/warehouse/stock-item", render: () => <ItemLocator /> },
  { path: "/warehouse/reports", render: () => <WarehouseReports /> },
  { path: "/crm/customer", render: () => <CrmCustomer /> },
  { path: "/crm/customer/new", render: () => <CrmCustomerForm /> },
  { path: "/crm/customer/:id", render: () => <CrmCustomerForm /> },
  { path: "/crm/customer/:id/profile", render: () => <CrmCustomerProfile /> },
  { path: "/crm/customer-orders", render: () => <CrmCustomerOrders /> },
  { path: "/crm/customer-orders/new", render: () => <CrmCustomerOrderForm /> },
  { path: "/crm/customer-orders/:id", render: () => <CrmCustomerOrderForm /> },
  { path: "/crm/bill-print", render: () => <CrmBillPrint /> },
  { path: "/crm/loyalty-management", render: () => <CrmLoyaltyManagement /> },
  { path: "/sales/pos-sales", render: () => <POSSales /> },
  { path: "/sales/pos-sales-return", render: () => <POSReturn /> },
  { path: "/sales/dealer-invoice", render: () => <DealerInvoice /> },
  { path: "/sales/dealer-invoice-return", render: () => <DealerInvoiceReturn /> },
  { path: "/sales/sales-on-approval", render: () => <SalesOnApproval /> },
  { path: "/sales/approval-inbox", render: () => <ApprovalInbox /> },
  { path: "/sales/settlement", render: () => <Settlement /> },
  { path: "/sales/reports", render: () => <SalesReports /> },
  { path: "/sales/touch-sales", render: () => <TouchSales /> },
  { path: "/sales/cash-opening", render: () => <CashOpening /> },
  { path: "/sales/cash-closing", render: () => <CashClosing /> },
  { path: "/sales/pos-old", render: () => <POSOld /> },
  { path: "/sales/customisation", render: () => <Customisation /> },
  { path: "/sales/customization", render: () => <Customisation /> },
  { path: "/analytical/stock-analyzer", render: () => <StockAnalyzer /> },
  { path: "/analytical/sales-comparer", render: () => <SalesComparer /> },
  { path: "/analytical/sales-vs-purchase", render: () => <SalesVsPurchase /> },
  { path: "/analytical/sales-vs-stock", render: () => <SalesVsStock /> },
  { path: "/finance/supplier-payment", render: () => <SupplierPayment /> },
];

export const isRegisteredProtectedPath = (pathname) =>
  Boolean(matchRoutes(protectedLayoutRoutes, String(pathname || "")));

export const renderProtectedLayoutRouteElements = () =>
  protectedLayoutRoutes.map((route) => (
    <Route key={route.path} path={route.path} element={route.render()} />
  ));

export const ProtectedLayoutRouteRenderer = ({ location }) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    <Routes location={location}>
      {renderProtectedLayoutRouteElements()}
      <Route path="*" element={<ComingSoon />} />
    </Routes>
  </Suspense>
);
