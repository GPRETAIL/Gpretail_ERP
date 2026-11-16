/**
 * Employee sticker labels for the shared sticker printer (features/warehouse/barcodes/BarcodeGeneration.jsx).
 * The code carries the salesperson's sticker value ("EMP-<id>"); the POS Salesperson field reads it.
 * people: [{ id, name, code, section, designation, sticker }], copies: { [id]: n }, codeType: "code" (QR) | "barcode".
 */
export const employeeStickerLabels = (people, copies, codeType) => people.flatMap((person) => {
  const count = Math.max(0, Math.min(500, Math.trunc(Number(copies?.[person.id] ?? 1)) || 0));
  const fields = [
    person.code ? { key: "emp_code", label: "ID", value: person.code } : null,
    person.section || person.designation ? { key: "emp_section", label: "", value: [person.section, person.designation].filter(Boolean).join(" · ") } : null,
  ].filter(Boolean);
  return Array.from({ length: count }, (_, index) => ({
    key: `employee-${person.id}-${index}`,
    codeValue: person.sticker || `EMP-${person.id}`,
    codeType: codeType === "barcode" ? "barcode" : "code",
    productName: person.name || "-",
    fields,
    note: "",
  }));
});
