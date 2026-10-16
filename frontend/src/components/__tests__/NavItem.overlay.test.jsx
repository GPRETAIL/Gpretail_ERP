import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";
import NavItem from "../NavItem";
import { createTenantTheme } from "../../theme/themeRegistry";

const navigate = vi.fn();
vi.mock("../../context/TabContext", () => ({ useTabs: () => ({ activeTabPath: "/settings/themes", navigateActiveTab: navigate }) }));
const Icon = () => <svg aria-hidden="true" />;
function Harness({ mode = "light", onNavigate }) {
  const [activeMenu, setActiveMenu] = useState(null);
  return <ThemeProvider theme={createTenantTheme({ theme_style: "glass" }, mode)}>
    <div data-testid="glass-sidebar" style={{ backdropFilter: "blur(36px)", transform: "translateX(0)" }}>
      <ul><NavItem name="Masters" icon={Icon} path="/masters" subItems={[{ name: "Product", path: "/masters/product" }]} isExpanded={false} activeMenu={activeMenu} setActiveMenu={setActiveMenu} onNavigate={onNavigate} /></ul>
    </div>
  </ThemeProvider>;
}

describe("sidebar flyout layering", () => {
  it.each(["light", "dark"])("escapes the glass sidebar stacking context in %s mode", (mode) => {
    render(<Harness mode={mode} />);
    fireEvent.click(screen.getByRole("button", { name: "Masters" }));
    const menu = screen.getByRole("list", { name: "Masters submenu" });
    expect(document.body).toContainElement(menu);
    expect(screen.getByTestId("glass-sidebar")).not.toContainElement(menu);
    expect(getComputedStyle(menu).position).toBe("fixed");
    expect(Number(getComputedStyle(menu).zIndex)).toBeGreaterThan(1200);
    expect(getComputedStyle(menu).backgroundColor).toBe(mode === "dark" ? "rgb(31, 41, 55)" : "rgb(255, 255, 255)");
  });

  it("dismisses outside and still navigates when an option is selected", () => {
    const onNavigate = vi.fn();
    render(<Harness onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Masters" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("list", { name: "Masters submenu" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Masters" }));
    fireEvent.click(screen.getByRole("button", { name: "Product" }));
    expect(navigate).toHaveBeenCalledWith("/masters/product");
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("list", { name: "Masters submenu" })).not.toBeInTheDocument();
  });
});
