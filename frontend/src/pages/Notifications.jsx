import { Box } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import NotificationInboxPanel from "../components/NotificationInboxPanel";
import { useTabs } from "../context/TabContext";

export default function Notifications() {
  const [params, setParams] = useSearchParams();
  const { navigateActiveTab } = useTabs();
  const section = params.get("tab") === "preferences" ? "preferences" : "inbox";
  const changeSection = value => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === "preferences") next.set("tab", value);
      else next.delete("tab");
      return next;
    }, { replace: true });
  };
  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
    <PageHeader title="Notifications" />
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <NotificationInboxPanel showHeading={false} section={section} onSectionChange={changeSection} onOpen={navigateActiveTab} />
    </Box>
  </Box>;
}
