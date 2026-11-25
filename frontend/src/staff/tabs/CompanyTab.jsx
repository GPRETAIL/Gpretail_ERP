import { useState } from "react";
import { Box } from "@mui/material";
import { STAFF_COLOR, STAFF_TEXT, TOUCH } from "../staffUi";
import AnnouncementsSection from "../company/AnnouncementsSection";
import HelpdeskSection from "../company/HelpdeskSection";
import DirectorySection from "../company/DirectorySection";
import DocumentsSection from "../company/DocumentsSection";

const SECTIONS = [
  { key: "news", label: "News" },
  { key: "help", label: "Help" },
  { key: "people", label: "People" },
  { key: "docs", label: "Documents" },
];

/** Company: what HR has published, a way to ask HR, colleagues and birthdays, and my documents. */
export default function CompanyTab({ onCounts }) {
  const [section, setSection] = useState("news");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box role="tablist" aria-label="Company" sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.5, p: 0.5, borderRadius: "14px", bgcolor: STAFF_COLOR.surfaceAlt }}>
        {SECTIONS.map(({ key, label }) => (
          <Box key={key} component="button" type="button" role="tab" aria-selected={section === key} onClick={() => setSection(key)}
            sx={{ minHeight: TOUCH - 6, border: 0, borderRadius: "10px", fontFamily: "inherit", fontSize: STAFF_TEXT.label, fontWeight: 800, cursor: "pointer",
              bgcolor: section === key ? STAFF_COLOR.surface : "transparent", color: section === key ? STAFF_COLOR.primaryDark : STAFF_COLOR.muted }}>
            {label}
          </Box>
        ))}
      </Box>
      {section === "news" && <AnnouncementsSection onCounts={onCounts} />}
      {section === "help" && <HelpdeskSection />}
      {section === "people" && <DirectorySection />}
      {section === "docs" && <DocumentsSection />}
    </Box>
  );
}
