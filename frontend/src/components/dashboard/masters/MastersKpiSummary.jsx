import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Tag, Truck, FolderTree } from "lucide-react";
import { wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurClass = (privacyMode) => (privacyMode ? "blur-sm select-none" : "");

export function TotalProductsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/masters/product")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_products)}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Active: {wholeNumber(summary.active_products)}</span>
        <span>Inactive: {wholeNumber(summary.inactive_products)}</span>
      </div>
    </div>
  );
}

export function BrandsCategoriesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/masters/brand")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Brands & Categories</span>
        <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_brands)}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Brands</span>
        <span>{wholeNumber(summary.total_categories)} Categories</span>
      </div>
    </div>
  );
}

export function SuppliersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/masters/supplier")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Suppliers</span>
        <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_suppliers)}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Active: {wholeNumber(summary.active_suppliers)}</span>
      </div>
    </div>
  );
}

export function DataQualityGapsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/masters/product?filter=missing_hsn")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Data Quality Gaps</span>
        <FolderTree className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.missing_hsn_count)}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Missing HSN</span>
        <span>{wholeNumber(summary.missing_barcode_count)} Missing Barcode</span>
      </div>
    </div>
  );
}
