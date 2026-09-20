import React from "react";
import { Plus, X } from "lucide-react";
import { Box, IconButton, Typography } from "@mui/material";
import { useTabs } from "../context/TabContext";

const TabBar = () => {
  const { tabs, activeTabId, addTab, closeTab, switchTab, moveTab } = useTabs();
  const [draggedTabId, setDraggedTabId] = React.useState(null);

  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", bgcolor: "action.hover", borderBottom: 1, borderColor: "divider",
        px: { xs: 0.5, md: 1 }, height: { xs: 28, md: 32 }, overflowX: "auto", overflowY: "hidden", flexShrink: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDashboard = tab.id === "dashboard";

          return (
            <Box
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              draggable
              onDragStart={(event) => {
                setDraggedTabId(tab.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", tab.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceTabId = draggedTabId || event.dataTransfer.getData("text/plain");
                moveTab(sourceTabId, tab.id);
                setDraggedTabId(null);
              }}
              onDragEnd={() => setDraggedTabId(null)}
              title={tab.name}
              sx={{
                display: "flex", alignItems: "center", gap: 0.5,
                px: { xs: 0.75, md: 1.25 }, py: { xs: 0.25, md: 0.5 },
                borderRadius: "6px 6px 0 0", fontSize: { xs: 10, md: 12 }, cursor: "pointer", userSelect: "none",
                width: { xs: 100, md: 160 }, minWidth: 0, overflow: "hidden", transition: "background-color 0.2s, color 0.2s",
                opacity: draggedTabId === tab.id ? 0.6 : 1,
                ...(isActive
                  ? { bgcolor: "background.paper", color: "#2563eb", borderTop: "2px solid #3b82f6", boxShadow: 1 }
                  : { color: "text.secondary", "&:hover": { bgcolor: "action.selected" } }),
              }}
            >
              <Typography component="span" noWrap sx={{ fontSize: 11, fontWeight: 500, flex: 1, minWidth: 0 }}>{tab.name}</Typography>
              {!isDashboard && (
                <IconButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  title="Close tab"
                  size="small"
                  sx={{ ml: 0.25, p: 0.25, borderRadius: 1, "&:hover": { bgcolor: "action.selected" } }}
                >
                  <X size={12} />
                </IconButton>
              )}
            </Box>
          );
        })}
      </Box>

      {tabs.length < 8 && (
        <IconButton
          type="button"
          onClick={addTab}
          title="New tab"
          size="small"
          sx={{ ml: 1, p: 0.5, borderRadius: 1, color: "text.secondary", flexShrink: 0, "&:hover": { bgcolor: "action.selected" } }}
        >
          <Plus size={14} />
        </IconButton>
      )}
    </Box>
  );
};

export default TabBar;
