import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ProtectedLayoutRouteRenderer } from "../protectedLayoutRoutes";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));
vi.mock("../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({}), saveTablePreference: vi.fn() }));

function Page({ path }) {
  const location = useLocation();
  const navigate = useNavigate();
  return <><button onClick={() => navigate(`${path}/new`)}>Create from dashboard</button><ProtectedLayoutRouteRenderer location={location} /></>;
}

it.each(["brand", "supplier"])("opens the %s create form after visiting its list", async entity => {
  const path = `/masters/${entity}`;
  render(<MemoryRouter initialEntries={[path]}><Page path={path} /></MemoryRouter>);
  expect(await screen.findByText(entity === "brand" ? "Search Brands" : "Search Results", {}, { timeout: 5000 })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Create from dashboard" }));
  expect(await screen.findByRole("button", { name: "Save", exact: true })).toBeVisible();
  expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
  expect(screen.queryByText(entity === "brand" ? "Search Brands" : "Search Results")).not.toBeInTheDocument();
});
