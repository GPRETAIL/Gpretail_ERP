import {
  HomeModernIcon, // Warehouse (Home/Inventory)
  UserGroupIcon, // CRM (Customer Relations)
  ShoppingCartIcon, // Sales (Retail)
  BanknotesIcon, // Finance (Money/Ledger)
  BuildingStorefrontIcon, // Store (Physical Store)
  ChartBarSquareIcon, // Analytical (Analytics/Reports)
  CommandLineIcon, // Masters (Data/Configuration)
  Cog6ToothIcon, // Settings (System Config)
  BuildingOffice2Icon, // Create Company (Admin Portal)

  // Sub-menu icons (Optional, for future use in NavItem component)
  TruckIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowDownCircleIcon,
  CreditCardIcon,
  ClockIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";

// Note: Paths are placeholders (e.g., /module/item-name)

export const navItems = [
  {
    name: "Dashboard",
    icon: ChartBarSquareIcon,
    path: "/dashboard",
  },
  {
    name: "Warehouse",
    icon: HomeModernIcon,
    subItems: [
      {
        name: "Dashboard",
        path: "/warehouse/dashboard",
        icon: ChartBarSquareIcon,
      },
      { name: "Courier", path: "/warehouse/courier", icon: TruckIcon },
      {
        name: "Transport Entry",
        path: "/warehouse/transport-entry",
        icon: TruckIcon,
      },
      { name: "Invoice", path: "/warehouse/invoice", icon: DocumentTextIcon },
      {
        name: "Inventory Entry",
        path: "/warehouse/inventory-entry",
        icon: ArchiveBoxIcon,
      },
      { name: "GRN", path: "/warehouse/grn", icon: DocumentTextIcon },
      {
        name: "Barcode",
        path: "/warehouse/barcode",
        icon: MagnifyingGlassIcon,
      },
      {
        name: "Customisation",
        path: "/warehouse/customisation",
        icon: Cog6ToothIcon,
      },
      {
        name: "Transport Issue",
        path: "/warehouse/transport-issue",
        icon: DocumentTextIcon,
      },
      {
        name: "Transport Receipt",
        path: "/warehouse/transport-receipt",
        icon: CheckCircleIcon,
      },
      {
        name: "Stock Outward",
        path: "/warehouse/stock-outward",
        icon: ArrowDownCircleIcon,
      },
      {
        name: "Receive Goods",
        path: "/warehouse/receive-goods",
        icon: CheckCircleIcon,
      },
      {
        name: "Physical Stock",
        path: "/warehouse/physical-stock",
        icon: MagnifyingGlassIcon,
      },
      {
        name: "Purchase Return",
        path: "/warehouse/purchase-return",
        icon: ArrowPathIcon,
      },
      {
        name: "Direct Purchase",
        path: "/warehouse/direct-purchase",
        icon: DocumentTextIcon,
      },
      {
        name: "Stock Item",
        path: "/warehouse/stock-item",
        icon: ArchiveBoxIcon,
      },
      { name: "Job Work", path: "/warehouse/job-work", icon: DocumentTextIcon },
      { name: "Reports", path: "/warehouse/reports", icon: DocumentTextIcon },
    ],
    path: "/warehouse",
  },
  {
    name: "CRM",
    icon: UserGroupIcon,
    subItems: [
      { name: "Customer", path: "/crm/customer", icon: UserGroupIcon },
      {
        name: "Customer Orders",
        path: "/crm/customer-orders",
        icon: DocumentTextIcon,
      },
      { name: "Bill Print", path: "/crm/bill-print", icon: DocumentTextIcon },
      {
        name: "Loyalty Management",
        path: "/crm/loyalty-management",
        icon: StarIcon,
      },
      {
        name: "Gift Voucher",
        path: "/crm/gift-voucher",
        icon: DocumentTextIcon,
      },
      { name: "Gift Coupon", path: "/crm/gift-coupon", icon: DocumentTextIcon },
      { name: "CRM Analyser", path: "/crm/analyser", icon: ChartBarSquareIcon },
      { name: "Send SMS", path: "/crm/send-sms", icon: DocumentTextIcon },
      {
        name: "Feedback Dashboard",
        path: "/crm/feedback-dashboard",
        icon: ChartBarSquareIcon,
      },
      {
        name: "Feedback Questions",
        path: "/crm/feedback-questions",
        icon: DocumentTextIcon,
      },
      {
        name: "Feedback Report",
        path: "/crm/feedback-report",
        icon: DocumentTextIcon,
      },
      {
        name: "Feedback Form Config",
        path: "/crm/feedback-form-config",
        icon: CommandLineIcon,
      },
      {
        name: "Customer Divert",
        path: "/crm/customer-divert",
        icon: ArrowPathIcon,
      },
    ],
    path: "/crm",
  },
  {
    name: "Sales",
    icon: ShoppingCartIcon,
    subItems: [
      { name: "POS Sales", path: "/sales/pos-sales", icon: ShoppingCartIcon },
      { name: "POS Old", path: "/sales/pos-old", icon: ShoppingCartIcon },
      {
        name: "POS Sales Return",
        path: "/sales/pos-sales-return",
        icon: ArrowPathIcon,
      },
      {
        name: "Dealer Sales Invoice",
        path: "/sales/dealer-invoice",
        icon: DocumentTextIcon,
      },
      {
        name: "Dealer Invoice Return",
        path: "/sales/dealer-invoice-return",
        icon: ArrowPathIcon,
      },
      {
        name: "Touch Sales",
        path: "/sales/touch-sales",
        icon: ShoppingCartIcon,
      },
      { name: "Settlement", path: "/sales/settlement", icon: CreditCardIcon },
      { name: "Delivery", path: "/sales/delivery", icon: TruckIcon },
      { name: "Gift Delivery", path: "/sales/gift-delivery", icon: StarIcon },
      {
        name: "Gift Delivery Issue",
        path: "/sales/gift-delivery-issue",
        icon: DocumentTextIcon,
      },
      {
        name: "Gift Coupon Issue",
        path: "/sales/gift-coupon-issue",
        icon: DocumentTextIcon,
      },
      { name: "Alteration", path: "/sales/alteration", icon: CommandLineIcon },
      {
        name: "Sales on Approval",
        path: "/sales/sales-on-approval",
        icon: ShoppingCartIcon,
      },
      {
        name: "Stock Item Locator",
        path: "/sales/stock-item-locator",
        icon: MagnifyingGlassIcon,
      },
      {
        name: "Cash Opening",
        path: "/sales/cash-opening",
        icon: CreditCardIcon,
      },
      { name: "Cash Closing", path: "/sales/cash-closing", icon: ClockIcon },
      {
        name: "Employee Sticker",
        path: "/sales/employee-sticker",
        icon: DocumentTextIcon,
      },
      {
        name: "Promotion Activator",
        path: "/sales/promotion-activator",
        icon: StarIcon,
      },
      {
        name: "B2B Sales Inbox",
        path: "/sales/b2b-inbox",
        icon: DocumentTextIcon,
      },
      {
        name: "Customisation",
        path: "/sales/customisation",
        icon: Cog6ToothIcon,
      },
      { name: "Reports", path: "/sales/reports", icon: DocumentTextIcon },
    ],
    path: "/sales",
  },
  {
    name: "Finance",
    icon: BanknotesIcon,
    subItems: [
      {
        name: "Supplier Payment",
        path: "/finance/supplier-payment",
        icon: CreditCardIcon,
      },
      {
        name: "Transport Payment",
        path: "/finance/transport-payment",
        icon: TruckIcon,
      },
      {
        name: "Credit Sale Collection",
        path: "/finance/credit-sale-collection",
        icon: CreditCardIcon,
      },
      { name: "GST Inbox", path: "/finance/gst-inbox", icon: DocumentTextIcon },
      {
        name: "Manage Ledger",
        path: "/finance/manage-ledger",
        icon: DocumentTextIcon,
      },
      {
        name: "Voucher Entry",
        path: "/finance/voucher-entry",
        icon: DocumentTextIcon,
      },
      { name: "Petty Cash", path: "/finance/petty-cash", icon: CreditCardIcon },
      {
        name: "Cheque Book",
        path: "/finance/cheque-book",
        icon: DocumentTextIcon,
      },
      { name: "Daybook", path: "/finance/daybook", icon: DocumentTextIcon },
      { name: "Payable", path: "/finance/payable", icon: CreditCardIcon },
      { name: "Receivable", path: "/finance/receivable", icon: CreditCardIcon },
      {
        name: "Trial Balance",
        path: "/finance/trial-balance",
        icon: DocumentTextIcon,
      },
      {
        name: "Trading Account",
        path: "/finance/trading-account",
        icon: DocumentTextIcon,
      },
      {
        name: "Profit & Loss Account",
        path: "/finance/p-l-account",
        icon: DocumentTextIcon,
      },
      {
        name: "Balance Sheet",
        path: "/finance/balance-sheet",
        icon: DocumentTextIcon,
      },
      {
        name: "Loan Reconciliation",
        path: "/finance/loan-reconciliation",
        icon: ArrowPathIcon,
      },
      {
        name: "Incentive Report",
        path: "/finance/incentive-report",
        icon: StarIcon,
      },
      {
        name: "Tally Integration",
        path: "/finance/tally-integration",
        icon: DocumentTextIcon,
      },
      {
        name: "Tally Configuration",
        path: "/finance/tally-configuration",
        icon: CommandLineIcon,
      },
      {
        name: "Opening Balance",
        path: "/finance/opening-balance",
        icon: CreditCardIcon,
      },
    ],
    path: "/finance",
  },
  {
    name: "Store",
    icon: BuildingStorefrontIcon,
    subItems: [
      {
        name: "Stock Inward",
        path: "/store/stock-inward",
        icon: DocumentTextIcon,
      },
      {
        name: "Transfer Goods",
        path: "/store/transfer-goods",
        icon: ArrowPathIcon,
      },
      { name: "Bill Edit", path: "/store/bill-edit", icon: DocumentTextIcon },
      {
        name: "Job Work Inbox",
        path: "/store/job-work-inbox",
        icon: ArchiveBoxIcon,
      },
      {
        name: "Tailoring Order",
        path: "/store/tailoring-order",
        icon: DocumentTextIcon,
      },
      {
        name: "Split Barcode",
        path: "/store/split-barcode",
        icon: CommandLineIcon,
      },
      {
        name: "Gift Pack Creation",
        path: "/store/gift-pack-creation",
        icon: StarIcon,
      },
      {
        name: "Last Bit Conversion",
        path: "/store/last-bit-conversion",
        icon: CommandLineIcon,
      },
      {
        name: "Price Changer",
        path: "/store/price-changer",
        icon: CreditCardIcon,
      },
      {
        name: "Stock Marker",
        path: "/store/stock-marker",
        icon: DocumentTextIcon,
      },
      {
        name: "Direct Stock Entry",
        path: "/store/direct-stock-entry",
        icon: DocumentTextIcon,
      },
      {
        name: "Physical Stock Audit",
        path: "/store/physical-stock-audit",
        icon: MagnifyingGlassIcon,
      },
      {
        name: "Sale Promotion Sch",
        path: "/store/sale-promotion-sch",
        icon: StarIcon,
      },
      {
        name: "Purchase Request",
        path: "/store/purchase-request",
        icon: DocumentTextIcon,
      },
      {
        name: "Purchase Request Que",
        path: "/store/purchase-request-que",
        icon: DocumentTextIcon,
      },
      {
        name: "Purchase Order",
        path: "/store/purchase-order",
        icon: DocumentTextIcon,
      },
      {
        name: "Store Transaction",
        path: "/store/store-transaction",
        icon: DocumentTextIcon,
      },
      { name: "Dumping", path: "/store/dumping", icon: ArrowDownCircleIcon },
      { name: "Daily Price", path: "/store/daily-price", icon: CreditCardIcon },
    ],
    path: "/store",
  },
  {
    name: "Analytical",
    icon: ChartBarSquareIcon,
    subItems: [
      {
        name: "360° Stock Analyzer",
        path: "/analytical/stock-analyzer",
        icon: ChartBarSquareIcon,
      },
      {
        name: "360° Purchase Analyzer",
        path: "/analytical/purchase-analyzer",
        icon: ChartBarSquareIcon,
      },
      {
        name: "360° Purchase Return",
        path: "/analytical/purchase-return",
        icon: ArrowPathIcon,
      },
      {
        name: "360° Sales Analyzer",
        path: "/analytical/sales-analyzer",
        icon: ChartBarSquareIcon,
      },
      {
        name: "Sales Comparer",
        path: "/analytical/sales-comparer",
        icon: CheckCircleIcon,
      },
      {
        name: "Sales Vs Purchase",
        path: "/analytical/sales-vs-purchase",
        icon: ChartBarSquareIcon,
      },
      {
        name: "Sales Vs Stock",
        path: "/analytical/sales-vs-stock",
        icon: ChartBarSquareIcon,
      },
      {
        name: "Stock Marker Analyzer",
        path: "/analytical/stock-marker-analyzer",
        icon: MagnifyingGlassIcon,
      },
      {
        name: "Reorder Status",
        path: "/analytical/reorder-status",
        icon: DocumentTextIcon,
      },
      {
        name: "Report Builder",
        path: "/analytical/report-builder",
        icon: DocumentTextIcon,
      },
      {
        name: "Purchase Budget",
        path: "/analytical/purchase-budget",
        icon: CreditCardIcon,
      },
      {
        name: "Purchase Planner",
        path: "/analytical/purchase-planner",
        icon: DocumentTextIcon,
      },
      {
        name: "Revenue Generation",
        path: "/analytical/revenue-generation",
        icon: ChartBarSquareIcon,
      },
    ],
    path: "/analytical",
  },
  {
    name: "Masters",
    icon: CommandLineIcon,
    subItems: [
      { name: "Product", path: "/masters/product", icon: DocumentTextIcon },
      { name: "Brand", path: "/masters/brand", icon: StarIcon },
      { name: "Tax", path: "/masters/tax", icon: CreditCardIcon },
      { name: "Transport", path: "/masters/transport", icon: TruckIcon },
      { name: "Item", path: "/masters/item", icon: DocumentTextIcon },
      { name: "Supplier", path: "/masters/supplier", icon: CommandLineIcon },
      {
        name: "Trade Agreement",
        path: "/masters/trade-agreement",
        icon: DocumentTextIcon,
      },
      { name: "Agent", path: "/masters/agent", icon: CommandLineIcon },
      { name: "Employee", path: "/masters/employee", icon: CommandLineIcon },
      {
        name: "Employee In/Out",
        path: "/masters/employee-in-out",
        icon: ClockIcon,
      },
      {
        name: "HR Configuration",
        path: "/masters/hr-configuration",
        icon: Cog6ToothIcon,
      },
      {
        name: "Salary Management",
        path: "/masters/salary-management",
        icon: CreditCardIcon,
      },
      { name: "Tailor", path: "/masters/tailor", icon: CommandLineIcon },
      {
        name: "Configuration",
        path: "/masters/configuration",
        icon: Cog6ToothIcon,
      },
      {
        name: "Product Attributes",
        path: "/masters/product-attributes",
        icon: CommandLineIcon,
      },
      {
        name: "Attribute Filter",
        path: "/masters/attribute-filter",
        icon: DocumentTextIcon,
      },
    ],
    path: "/masters",
  },
  {
    name: "User Access",
    icon: UserGroupIcon,
    subItems: [
      { name: "Create User", path: "/user-access/user", icon: UserGroupIcon },
      { name: "Create Group", path: "/user-access/group", icon: UserGroupIcon },
    ],
    path: "/user-access",
  },
  {
    name: "Settings",
    icon: Cog6ToothIcon,
    subItems: [
      { name: "Company", path: "/settings/company", icon: StarIcon },
      { name: "Branding", path: "/settings/branding", icon: SwatchIcon },
      {
        name: "Configure Local Server",
        path: "/settings/configure-local-server",
        icon: CommandLineIcon,
      },
      {
        name: "Incentive Configuration",
        path: "/settings/incentive-configuration",
        icon: StarIcon,
      },
      {
        name: "Number Configuration",
        path: "/settings/number-configuration",
        icon: DocumentTextIcon,
      },
      {
        name: "Application Settings",
        path: "/settings/application-settings",
        icon: Cog6ToothIcon,
      },
      {
        name: "Printing Configuration",
        path: "/settings/printing-configuration",
        icon: DocumentTextIcon,
      },
      {
        name: "Backup Center",
        path: "/settings/backup",
        icon: ArchiveBoxIcon,
      },
      {
        name: "Margin Controller",
        path: "/settings/margin-controller",
        icon: CreditCardIcon,
      },
      {
        name: "Reorder Configuration",
        path: "/settings/reorder-configuration",
        icon: CommandLineIcon,
      },
      { name: "Scheduler", path: "/settings/scheduler", icon: ClockIcon },
      {
        name: "Data Migration",
        path: "/settings/data-migration",
        icon: ArrowPathIcon,
      },
      {
        name: "System Command",
        path: "/settings/system-command",
        icon: CommandLineIcon,
      },
    ],
    path: "/settings",
  },
];

export const ownerNavItems = [
  {
    name: "Dashboard",
    icon: HomeModernIcon,
    path: "/owner/dashboard",
  },
  {
    name: "Create Company",
    icon: BuildingOffice2Icon,
    path: "/owner/company/new",
  },
  {
    name: "Subscriptions",
    icon: CreditCardIcon,
    path: "/owner/subscriptions",
  },
  {
    name: "Subscription Plans",
    icon: CreditCardIcon,
    path: "/owner/plans",
  },
  {
    name: "Store Management",
    icon: BuildingStorefrontIcon,
    path: "/owner/stores",
  },
  {
    name: "Warehouse Management",
    icon: HomeModernIcon,
    path: "/owner/warehouses",
  },
  {
    name: "User",
    icon: UserGroupIcon,
    path: "/owner/user",
  },
  {
    name: "Cloud Settings",
    icon: Cog6ToothIcon,
    path: "/owner/cloud-settings",
  },
  {
    name: "Store Monitoring",
    icon: MagnifyingGlassIcon,
    path: "/owner/store-monitoring",
  },
  {
    name: "System Monitoring",
    icon: ChartBarSquareIcon,
    path: "/owner/monitoring",
  },
  {
    name: "Audit Logs",
    icon: DocumentTextIcon,
    path: "/owner/audit-logs",
  },
];
