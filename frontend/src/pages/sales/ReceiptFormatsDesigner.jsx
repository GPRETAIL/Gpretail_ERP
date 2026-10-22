import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import SalesSettingsEditor from "../../components/sales/SalesSettingsEditor";
import DocumentFormatsDesigner from "./DocumentFormatsDesigner";
import { loadPrintFormatSettings } from "../../utils/printFormatDefaults";

export default function ReceiptFormatsDesigner() {
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    return requested === "thermal" || (!requested && loadPrintFormatSettings().pdfFormat === "thermal") ? "thermal" : "documents";
  });
  const changeSection = next => {
    if (next === section) return;
    if (dirty && !window.confirm("Discard unsaved print format changes?")) return;
    setDirty(false);
    setSection(next);
  };
  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", p: 1, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
      <Typography component="h1" sx={{ fontSize: 16, fontWeight: 700, mr: 2 }}>Print Formats</Typography>
      <Button aria-pressed={section === "thermal"} variant={section === "thermal" ? "contained" : "outlined"} onClick={() => changeSection("thermal")}>Thermal Receipts</Button>
      <Button aria-pressed={section === "documents"} variant={section === "documents" ? "contained" : "outlined"} onClick={() => changeSection("documents")}>Document Invoices</Button>
    </Stack>
    <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      {section === "thermal" ? <SalesSettingsEditor section="receipt" onDirtyChange={setDirty} /> : <DocumentFormatsDesigner onDirtyChange={setDirty} />}
    </Box>
  </Box>;
}
