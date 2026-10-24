import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Notifications from "../Notifications";

const { get, navigateActiveTab, user } = vi.hoisted(() => ({ get: vi.fn(), navigateActiveTab: vi.fn(), user: { id: 1 } }));
vi.mock("../../api/axios", () => ({ default: { get } }));
vi.mock("react-redux", () => ({ useSelector: select => select({ auth: { user } }) }));
vi.mock("../../context/TabContext", () => ({ useTabs: () => ({ navigateActiveTab }) }));
vi.mock("../../utils/webPush", () => ({ pushDeviceState: async () => ({ supported: false }), enableWebPush: vi.fn(), disableWebPush: vi.fn() }));

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output>{location.pathname}{location.search}</output><button onClick={() => navigate("/notifications?tab=preferences")}>Header preferences shortcut</button><Notifications /></>;
}
beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async path => ({ data: path === "/notifications" ? { data: [{ id: 1, title: "Low stock", message: "Review stock", link: "/warehouse/stock-item" }], pagination: { has_next: false } } : { data: path === "/notification-preferences" ? { marketing: false, quiet_start: 21, quiet_end: 8 } : { enabled: false } } }));
});

it("opens preferences from a deep link, with one shared page heading and no return-to-ERP screen", async () => {
  render(<MemoryRouter initialEntries={["/notifications?source=header&tab=preferences"]}><NavigationProbe /></MemoryRouter>);
  expect(await screen.findByRole("checkbox", { name: "Receive subscription offers" })).not.toBeChecked();
  expect(screen.getByRole("tab", { name: "Preferences", selected: true })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: "Notifications", exact: true })).toHaveLength(1);
  expect(screen.queryByText("Return to ERP")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Inbox", exact: true }));
  await screen.findByText("Low stock");
  expect(screen.getByRole("status")).toHaveTextContent("/notifications?source=header");
  fireEvent.click(screen.getByRole("button", { name: "View details" }));
  expect(navigateActiveTab).toHaveBeenCalledWith("/warehouse/stock-item");
});

it("responds to the header preferences shortcut while the inbox is already mounted", async () => {
  render(<MemoryRouter initialEntries={["/notifications"]}><NavigationProbe /></MemoryRouter>);
  await screen.findByText("Low stock");
  fireEvent.click(screen.getByRole("button", { name: "Header preferences shortcut" }));
  await waitFor(() => expect(screen.getByRole("tab", { name: "Preferences", selected: true })).toBeInTheDocument());
  expect(await screen.findByRole("checkbox", { name: "Receive subscription offers" })).not.toBeChecked();
});
