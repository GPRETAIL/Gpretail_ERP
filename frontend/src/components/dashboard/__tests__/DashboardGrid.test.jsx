import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPut = vi.fn(() => Promise.resolve({ data: { success: true } }));
vi.mock("../../../api/axios", () => ({
  default: { get: (...args) => mockGet(...args), put: (...args) => mockPut(...args) },
}));

// react-grid-layout needs real layout/DOM measurement it can't get in jsdom. Stubbing it out
// keeps this test focused on DashboardGrid's own hide/restore/merge logic (what this suite
// guards) rather than the third-party grid's drag mechanics -- the exposed "fire-layout-change"
// button lets a test simulate exactly what a real drag/resize reports back.
vi.mock("react-grid-layout/legacy", () => ({
  Responsive: ({ children, onLayoutChange, layouts }) => (
    <div data-testid="grid">
      {children}
      <button onClick={() => onLayoutChange(layouts.lg)}>fire-layout-change</button>
    </div>
  ),
  WidthProvider: (Component) => Component,
}));

import DashboardGrid from "../DashboardGrid";
import { DashboardLayoutProvider, useDashboardLayout } from "../../../context/DashboardLayoutContext";

const Widget = ({ label }) => <div>{label} content</div>;

const WIDGETS = [
  { key: "alpha", title: "Alpha Widget", component: Widget, props: { label: "Alpha" }, defaultLayout: { x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 } },
  { key: "beta", title: "Beta Widget", component: Widget, props: { label: "Beta" }, defaultLayout: { x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2 } },
];

/** Mirrors the real "Customize Layout" toggle Dashboard.jsx owns -- DashboardGrid itself never
 * flips edit mode, so the test needs the same context control a real page provides. */
const EditModeToggle = () => {
  const { editMode, setEditMode } = useDashboardLayout();
  return <button onClick={() => setEditMode((prev) => !prev)}>{editMode ? "Done" : "Customize"}</button>;
};

const renderGrid = (savedLayout) => {
  mockGet.mockResolvedValueOnce({ data: { data: savedLayout ? { overview: savedLayout } : {} } });
  return render(
    <DashboardLayoutProvider>
      <EditModeToggle />
      <DashboardGrid tabKey="overview" widgets={WIDGETS} />
    </DashboardLayoutProvider>
  );
};

beforeEach(() => {
  mockGet.mockClear();
  mockPut.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("DashboardGrid hide/restore", () => {
  it("renders every widget when nothing is hidden", async () => {
    renderGrid();
    expect(await screen.findByText("Alpha content")).toBeInTheDocument();
    expect(screen.getByText("Beta content")).toBeInTheDocument();
  });

  it("excludes a widget saved as hidden, even outside edit mode", async () => {
    renderGrid([
      { i: "alpha", x: 0, y: 0, w: 6, h: 2, hidden: true },
      { i: "beta", x: 6, y: 0, w: 6, h: 2 },
    ]);
    await screen.findByText("Beta content");
    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();
  });

  it("hides a widget on remove and shows it in the restore tray", async () => {
    renderGrid();
    await screen.findByText("Alpha content");
    fireEvent.click(screen.getByText("Customize"));

    fireEvent.click(await screen.findByLabelText("Remove Alpha Widget from dashboard"));

    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();
    expect(screen.getByText("Beta content")).toBeInTheDocument();
    expect(screen.getByText("Removed from this dashboard (1)")).toBeInTheDocument();
    expect(screen.getByLabelText("Add Alpha Widget back to dashboard")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/dashboard/layout/overview",
        { layout: expect.arrayContaining([expect.objectContaining({ i: "alpha", hidden: true })]) }
      )
    );
  });

  it("restores a hidden widget from the tray", async () => {
    renderGrid([
      { i: "alpha", x: 0, y: 0, w: 6, h: 2, hidden: true },
      { i: "beta", x: 6, y: 0, w: 6, h: 2 },
    ]);
    await screen.findByText("Beta content");
    fireEvent.click(screen.getByText("Customize"));

    fireEvent.click(await screen.findByLabelText("Add Alpha Widget back to dashboard"));

    expect(await screen.findByText("Alpha content")).toBeInTheDocument();
    expect(screen.queryByText(/Removed from this dashboard/)).not.toBeInTheDocument();
  });

  it("preserves a hidden widget's flag when another widget is dragged/resized", async () => {
    renderGrid([
      { i: "alpha", x: 0, y: 0, w: 6, h: 2, hidden: true },
      { i: "beta", x: 6, y: 0, w: 6, h: 2 },
    ]);
    await screen.findByText("Beta content");
    fireEvent.click(screen.getByText("Customize"));

    // Simulates react-grid-layout reporting a resize for the only *visible* item -- it never
    // reports layout for a widget it isn't rendering, so this is exactly the shape a real
    // drag/resize of Beta would produce while Alpha stays hidden.
    fireEvent.click(await screen.findByText("fire-layout-change"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/dashboard/layout/overview",
        {
          layout: expect.arrayContaining([
            expect.objectContaining({ i: "alpha", hidden: true }),
            expect.objectContaining({ i: "beta" }),
          ]),
        }
      )
    );
  });
});
