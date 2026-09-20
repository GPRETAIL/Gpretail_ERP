import { PlusCircle, Trash2 } from "lucide-react";
import { Box, Checkbox, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

const cellInputSx = (disabled) => ({
  width: "100%",
  border: "1px solid",
  borderColor: "divider",
  textAlign: "center",
  p: 0.5,
  fontSize: "inherit",
  fontFamily: "inherit",
  color: "text.primary",
  bgcolor: disabled ? "action.hover" : "background.paper",
  cursor: disabled ? "not-allowed" : "text",
});

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
    <Box sx={{ width: "100%" }}>
      <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider" }}>
        <Table size="small" sx={{ "& td, & th": { borderBottom: 1, borderColor: "divider" } }}>
          {/* Table Header */}
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontSize: 12 }}>From</TableCell>
              <TableCell align="center" sx={{ fontSize: 12 }}>To</TableCell>
              <TableCell align="center" sx={{ fontSize: 12 }}>TAX %</TableCell>
              <TableCell align="center" sx={{ fontSize: 12 }}>CGST %</TableCell>
              <TableCell align="center" sx={{ fontSize: 12 }}>SGST %</TableCell>
              <TableCell align="center" sx={{ fontSize: 12, whiteSpace: "nowrap" }}>IN Cost</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>

          {/* Table Body */}
          <TableBody>
            {rangedTaxItems.map((item, index) => (
              <TableRow key={index}>
                {/* From */}
                <TableCell sx={{ p: 0.75 }}>
                  <Box
                    component="input"
                    type="number"
                    value={item.from}
                    disabled={isView || index > 0}
                    onChange={(e) =>
                      handleRangedTaxItemChange(index, "from", e.target.value)
                    }
                    sx={cellInputSx(isView || index > 0)}
                  />
                </TableCell>

                {/* To */}
                <TableCell sx={{ p: 0.75 }}>
                  <Box
                    component="input"
                    type="number"
                    value={item.to}
                    disabled={isView}
                    onChange={(e) =>
                      handleRangedTaxItemChange(index, "to", e.target.value)
                    }
                    sx={cellInputSx(isView)}
                  />
                </TableCell>

                {/* Tax */}
                <TableCell sx={{ p: 0.75 }}>
                  <Box
                    component="input"
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
                    sx={cellInputSx(isView)}
                  />
                </TableCell>

                {/* CGST (Disabled) */}
                <TableCell sx={{ p: 0.75 }}>
                  <Box
                    component="input"
                    type="number"
                    value={item.cgstPercentage}
                    name="cgstPercentage"
                    disabled
                    sx={{ ...cellInputSx(true), color: "text.secondary" }}
                  />
                </TableCell>

                {/* SGST (Disabled) */}
                <TableCell sx={{ p: 0.75 }}>
                  <Box
                    component="input"
                    type="number"
                    name="sgstPercentage"
                    value={item.sgstPercentage}
                    disabled
                    sx={{ ...cellInputSx(true), color: "text.secondary" }}
                  />
                </TableCell>

                {/* In Cost (Checkbox) */}
                <TableCell align="center" sx={{ p: 0.75 }}>
                  <Checkbox
                    checked={item.inCost}
                    disabled={isView}
                    onChange={(e) =>
                      handleRangedTaxItemChange(
                        index,
                        "inCost",
                        e.target.checked
                      )
                    }
                    size="small"
                    // Blue accent color remains the same in both themes for visibility
                    sx={{ color: "#2563eb", "&.Mui-checked": { color: "#2563eb" } }}
                  />
                </TableCell>

                {/* Action Button */}
                <TableCell align="center" sx={{ p: 0.75 }}>
                  {index === 0 && !isView && (
                    <IconButton
                      onClick={handleAddRangedTaxItem}
                      aria-label="Add range"
                      title="Add range"
                      disabled={isView}
                      size="small"
                      sx={{ color: "success.main", "&:hover": { color: "success.dark" } }}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </IconButton>
                  )}

                  {index > 0 && !isView && (
                    <IconButton
                      onClick={() => handleRemoveRangedTaxItem(index)}
                      aria-label={`Delete row ${index + 1}`}
                      title="Delete row"
                      size="small"
                      sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default RangedTaxTable;
