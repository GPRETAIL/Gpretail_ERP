import { PlusCircle, Trash2 } from "lucide-react";

const RangedTaxTable = ({ isView, rangedTaxItems, setRangedTaxItems }) => {
  // Add new range
  const handleAddRangedTaxItem = () => {
    const firstItem = rangedTaxItems[0];

    // Check if row is empty
    const isEmptyRow =
      (firstItem.from === "" || firstItem.from === 0) &&
      (firstItem.to === "" || firstItem.to === 0) &&
      (firstItem.taxPercentage === "" || firstItem.taxPercentage === 0) &&
      (firstItem.cgstPercentage === "" || firstItem.cgstPercentage === 0) &&
      (firstItem.sgstPercentage === "" || firstItem.sgstPercentage === 0) &&
      firstItem.inCost === false;

    if (isEmptyRow) {
      alert("Please fill the top row before adding a new one.");
      return;
    }

    // Duplicate check (ignore first row itself)
    const isDuplicate = rangedTaxItems
      .slice(1) // check only existing filled rows
      .some(
        (item) =>
          Number(item.from) === Number(firstItem.from) &&
          Number(item.to) === Number(firstItem.to) &&
          Number(item.taxPercentage) === Number(firstItem.taxPercentage)
      );

    if (isDuplicate) {
      alert(
        "Duplicate range detected. Modify the first row before adding a new one."
      );
      return;
    }

    // New row starts from last firstItem.to
    const newFrom = firstItem.to || 0;

    // Insert new row at the TOP
    setRangedTaxItems((prev) => [
      {
        from: newFrom,
        to: newFrom,
        taxPercentage: 0,
        cgstPercentage: 0,
        sgstPercentage: 0,
        inCost: false,
      },
      ...prev,
    ]);
  };

  // Remove row
  const handleRemoveRangedTaxItem = (index) => {
    setRangedTaxItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update field
  const handleRangedTaxItemChange = (index, field, value) => {
    const newItems = [...rangedTaxItems];

    let newValue = value;

    // Only parse numeric fields
    if (["from", "to", "taxPercentage"].includes(field)) {
      if (value === "") {
        newValue = ""; // allow empty input
      } else {
        newValue = parseFloat(value) || 0;
      }
    }

    // Update the field
    newItems[index] = { ...newItems[index], [field]: newValue };

    // Update CGST/SGST if taxPercentage
    if (field === "taxPercentage" && newValue !== "") {
      newItems[index].cgstPercentage = newValue / 2;
      newItems[index].sgstPercentage = newValue / 2;
    }

    setRangedTaxItems(newItems);
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Table Header */}
          <thead className="bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-2 py-1 text-xs text-center">From</th>
              <th className="px-2 text-xs text-center">To</th>
              <th className="px-2 text-xs text-center">TAX %</th>
              <th className="px-2 text-xs text-center">CGST %</th>
              <th className="px-2  text-xs text-center">SGST %</th>
              <th className="px-2  text-xs text-center text-nowrap">IN Cost</th>
              <th className="px-2  w-[50px]"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
            {rangedTaxItems.map((item, index) => (
              <tr key={index}>
                {/* From */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={item.from}
                    disabled={isView || index > 0}
                    onChange={(e) =>
                      handleRangedTaxItemChange(index, "from", e.target.value)
                    }
                    className={`w-full p-1 border text-center 
                      border-gray-300 dark:border-gray-600 dark:text-gray-100
                      ${
                        isView || index > 0
                          ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800"
                      }`}
                  />
                </td>

                {/* To */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={item.to}
                    disabled={isView}
                    onChange={(e) =>
                      handleRangedTaxItemChange(index, "to", e.target.value)
                    }
                    className={`w-full p-1 border text-center 
                      border-gray-300 dark:border-gray-600 dark:text-gray-100
                      ${
                        isView
                          ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800"
                      }`}
                  />
                </td>

                {/* Tax */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={item.taxPercentage}
                    disabled={isView}
                    onChange={(e) =>
                      handleRangedTaxItemChange(
                        index,
                        "taxPercentage",
                        e.target.value
                      )
                    }
                    className={`w-full p-1 border text-center 
                      border-gray-300 dark:border-gray-600 dark:text-gray-100
                      ${
                        isView
                          ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800"
                      }`}
                  />
                </td>

                {/* CGST (Disabled) */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={item.cgstPercentage}
                    name="cgstPercentage"
                    disabled
                    className="w-full p-1 border text-center 
                      border-gray-300 dark:border-gray-600 dark:text-gray-400
                      bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                </td>

                {/* SGST (Disabled) */}
                <td className="p-1.5">
                  <input
                    type="number"
                    name="sgstPercentage"
                    value={item.sgstPercentage}
                    disabled
                    className="w-full p-1 border text-center 
                      border-gray-300 dark:border-gray-600 dark:text-gray-400
                      bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                </td>

                {/* In Cost (Checkbox) */}
                <td className="p-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={item.inCost}
                    disabled={isView}
                    onChange={(e) =>
                      handleRangedTaxItemChange(
                        index,
                        "inCost",
                        e.target.checked
                      )
                    }
                    // Blue accent color remains the same in both themes for visibility
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                </td>

                {/* Action Button */}
                <td className="text-center p-1.5">
                  {index === 0 && !isView && (
                    <button
                      onClick={handleAddRangedTaxItem}
                      className="text-green-500 hover:text-green-700 transition"
                      aria-label="Add range"
                      title="Add range"
                      disabled={isView}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}

                  {index > 0 && !isView && (
                    <button
                      onClick={() => handleRemoveRangedTaxItem(index)}
                      className="text-red-500 hover:text-red-700 transition"
                      aria-label={`Delete row ${index + 1}`}
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RangedTaxTable;
