import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";
import UploadImportButton from "../../components/UploadImportButton";
import { getImportProps } from "../../utils/attrImportConfigs";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const SelectInput = ({
  label,
  name,
  required = false,
  options,
  value,
  onChange,
}) => (
  <div className="flex items-center">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3">
      {required && <span className="text-red-500 mr-1">*</span>} {label}
    </label>

    <select
      name={name}
      value={value}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select {label}</option>

      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const ProductAttributes = () => {
  // const mockAttributeValues = {
  //   SIZE: ["XS", "S", "M", "L", "XL", "XXL"],
  //   SIZEGROUP: ["ADULT", "KIDS", "INFANT", "TEEN"],
  //   PATTERN: ["Plain", "Striped", "Checked", "Printed", "Floral"],
  //   STYLE: ["Casual", "Formal", "Sports", "Vintage", "Streetwear"],
  //   TYPE: ["Shirt", "T-Shirt", "Jeans", "Jacket", "Kurta"],
  //   COLOUR: ["Red", "Blue", "Black", "White", "Green", "Yellow"],
  //   MATERIAL: ["Cotton", "Polyester", "Denim", "Wool", "Silk", "Rayon"],
  //   SLEEVE: ["Full Sleeve", "Half Sleeve", "Sleeveless", "3/4 Sleeve"],
  //   FIT: ["Regular", "Slim", "Loose", "Relaxed"],
  //   MARKER: ["New", "Clearance", "Hot Item", "Seasonal"],
  //   AGESET: ["0-1 Y", "1-3 Y", "3-6 Y", "6-12 Y", "Adult"],
  //   UNITS: ["Piece", "Set", "Pack", "Meter"],
  //   PRODUCTGROUPS: ["Men", "Women", "Kids", "Accessories"],
  //   PRODUCTHIERARCHY: ["Topwear", "Bottomwear", "Ethnic", "Outerwear"],
  //   SUPPLIERGROUP: ["Local Supplier", "Overseas Supplier", "Premium Supplier"],
  //   CUSTOMERGROUP: ["Regular Customer", "Wholesale", "Online", "VIP"],
  //   BUYERSGROUP: ["Internal Buyer", "External Buyer", "Franchise Buyer"],
  //   BARCODEID: ["BR001", "BR002", "BR003", "BR004"],
  //   DIVISION: ["Men's", "Women's", "Kids", "Unisex"],
  //   PRODUCTDIVISION: ["Apparel", "Footwear", "Lifestyle"],
  //   ITEMGROUPS: ["Tops", "Bottoms", "Formal", "Casual"],
  //   PRICETAGS: ["Tag A", "Tag B", "Tag C"],
  //   SELLINGNAMES: ["Premium Shirt", "Casual Tee", "Designer Kurta"],
  //   PRODUCTCOVERAGE: ["National", "Regional", "Store Level"],
  //   DAILYPRICEGROUP: ["DPG1", "DPG2", "DPG3"],
  //   COREPRODUCTGROUP: ["Basic Essentials", "Seasonal Core"],
  //   DUMPINGGROUP: ["Warehouse Dump", "Store Dump"],
  //   CUSTOMFIELDS: ["Field1", "Field2", "Field3"],
  // };

  const mockOptions = [
    { label: "SIZE", value: "SIZE" },
    { label: "SIZE GROUP", value: "SIZEGROUP" },
    { label: "PATTERN", value: "PATTERN" },
    { label: "STYLE", value: "STYLE" },
    { label: "TYPE", value: "TYPE" },
    { label: "COLOUR", value: "COLOUR" },
    { label: "MATERIAL", value: "MATERIAL" },
    { label: "SLEEVE", value: "SLEEVE" },
    { label: "FIT", value: "FIT" },
    { label: "STOCK MARKER", value: "MARKER" },
    { label: "AGESET", value: "AGESET" },
    { label: "UNITS", value: "UNITS" },
    { label: "PRODUCT GROUPS", value: "PRODUCTGROUPS" },
    { label: "PRODUCT HIERARCHY", value: "PRODUCTHIERARCHY" },
    { label: "SUPPLIER GROUP", value: "SUPPLIERGROUP" },
    { label: "CUSTOMER GROUP", value: "CUSTOMERGROUP" },
    { label: "BUYER GROUP", value: "BUYERSGROUP" },
    { label: "BARCODE ID", value: "BARCODEID" },
    { label: "SECTION", value: "DIVISION" },
    { label: "PRODUCT DIVISION", value: "PRODUCTDIVISION" },
    { label: "ITEM GROUPS", value: "ITEMGROUPS" },
    { label: "PRICE TAGS", value: "PRICETAGS" },
    { label: "SELLING NAME TEMPLATE", value: "SELLINGNAMES" },
    { label: "PRODUCT COVERAGE", value: "PRODUCTCOVERAGE" },
    { label: "DAILY PRICE GROUP", value: "DAILYPRICEGROUP" },
    { label: "CORE PRODUCT GROUP", value: "COREPRODUCTGROUP" },
    { label: "DUMPING GROUP", value: "DUMPINGGROUP" },
    { label: "CUSTOM FIELDS", value: "CUSTOMFIELDS" },
    { label: "COMPANY TYPE", value: "COMPANYTYPE" },
  ];

  const [formData, setFormData] = useState({ productType: "" });
  const [attributeValues, setAttributeValues] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);
  const storeMap = useStoreNameMap();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSearch = async () => {
    if (!formData.productType) {
      toast.warning("Please select a Product Type first!");
      return;
    }
    try {
      let rows = [];

      if (formData.productType === "SIZE") {
        const res = await api.get("/sizes", { params: { all: "true" } });
        rows = (res.data?.data || []).map((s) => ({
          id: s.id,
          name: s.size_name,
          isActive: true,
          code: s.code || "--",
          created_by: s.created_by ?? "",
          company_id: s.company_id ?? null,
        }));
      } else if (formData.productType === "SIZEGROUP") {
        const res = await api.get("/size-groups", { params: { all: "true" } });
        rows = (res.data?.data || []).map((g) => ({
          id: g.id,
          name: g.group_name,
          isActive: true,
          code: (g.sizes || []).map((s) => s.size_name).join(", ") || "--",
          created_by: g.created_by ?? "",
          company_id: g.company_id ?? null,
        }));
      } else {
        const res = await api.get(`/attributes/${formData.productType.toLowerCase()}`, { params: { all: "true" } });
        rows = (res.data?.data || []).map((a) => ({
          id: a.id,
          name: a.name,
          isActive: a.is_active,
          code: a.code || "--",
          created_by: a.created_by ?? "",
          company_id: a.company_id ?? null,
        }));
      }

      setAttributeValues(rows);
      if (rows.length === 0) toast.info("No records found for this type.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    }
  };

  // Auto-load when type changes
  useEffect(() => {
    if (formData.productType) handleSearch();
    setTablePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.productType]);

  const navigate = useNavigate();

  const handleNew = () => {
    const query = formData.productType ? `?type=${formData.productType}` : "";
    navigate(`/masters/product-attributes/new${query}`);
  };

  const handleEdit = (id) => {
    navigate(`/masters/product-attributes/new?type=${formData.productType}&id=${id}`);
  };

  const getDeleteEndpoint = (type, id) => {
    if (type === "SIZE") return `/sizes/${id}`;
    if (type === "SIZEGROUP") return `/size-groups/${id}`;
    return `/attributes/${type.toLowerCase()}/${id}`;
  };

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(getDeleteEndpoint(formData.productType, id));
      toast.success(`"${name}" deleted successfully.`);
      setAttributeValues((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const attributeColumns = [
    { key: "name", label: "Name" },
    {
      key: "isActive",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.isActive ? "yes" : "no"),
    },
    {
      key: "code",
      label: formData.productType === "SIZEGROUP" ? "Sizes" : "Code",
    },
    {
      key: "created_by",
      label: "Created By",
      render: (value) => value || "—",
      searchValue: (row) => row.created_by || "",
    },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/masters")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Master
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Product Attributes</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={handleNew}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          {formData.productType && (() => {
            const ip = getImportProps(formData.productType);
            return ip ? (
              <>
                <span>|</span>
                <UploadImportButton
                  endpoint={ip.endpoint}
                  fieldConfig={ip.fieldConfig}
                  transform={ip.transform}
                  className="text-xs font-medium"
                  onDone={handleSearch}
                />
              </>
            ) : null;
          })()}
        </div>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-12 gap-3">
            {/* Column 1 */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              <SearchableSelect
                label="Product Type"
                name="productType"
                options={mockOptions}
                value={formData.productType}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>
      {formData.productType && (
        <div className="col-span-12 mt-4 p-5">
          <FilterableDataTable
            rows={attributeValues}
            columns={attributeColumns}
            onRowClick={(row) => handleEdit(row.id)}
            enableKeyboardNav
            loading={false}
            emptyText="No records found for this Product Type."
            searchPlaceholder="Search in attribute fields..."
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            tablePreferenceKey={`masters.product-attributes.${formData.productType.toLowerCase()}`}
            paginationMode="client"
            page={tablePage}
            limit={tableLimit}
            totalRows={attributeValues.length}
            totalPages={Math.max(Math.ceil(attributeValues.length / Math.max(tableLimit, 1)), 1)}
            onPageChange={setTablePage}
            onLimitChange={(value) => {
              setTableLimit(value);
              setTablePage(1);
            }}
            renderActions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(row.id)}
                  title="Edit"
                  className="glass-btn glass-btn-primary"
                  type="button"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                  title="Delete"
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default ProductAttributes;
