import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gridState = vi.hoisted(() => ({ mounted: true, width: 1200, props: null }));

const mockGet = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPut = vi.fn(() => Promise.resolve({ data: { success: true } }));
vi.mock("../../../api/axios", () => ({
  default: { get: (...args) => mockGet(...args), put: (...args) => mockPut(...args) },
}));

// react-grid-layout needs real layout/DOM measurement it can't get in jsdom. Stubbing it out
// keeps this test focused on DashboardGrid's own hide/restore/merge logic (what this suite
// guards) rather than the third-party grid's drag mechanics -- the exposed "fire-layout-change"
// button lets a test simulate exactly what a real drag/resize reports back.
vi.mock("react-grid-layout", () => ({
  Responsive: (props) => {
    gridState.props = props;
    const { children, onLayoutChange, layouts } = props;
    return (
    <div data-testid="grid">
      {children}
      <button onClick={() => onLayoutChange(layouts.lg)}>fire-layout-change</button>
    </div>
    );
  },
  useContainerWidth: () => ({ width: gridState.width, containerRef: { current: null }, mounted: gridState.mounted }),
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
  gridState.mounted = true;
  gridState.width = 1200;
  gridState.props = null;
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


describe("DashboardGrid container measurement", () => {
  it("waits for measurement before rendering widgets", () => {
    gridState.mounted = false;
    renderGrid();
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();
  });

  it("preserves grid sizing and restricts dragging and resizing to edit mode", async () => {
    gridState.width = 860;
    renderGrid();
    await screen.findByText("Alpha content");
    expect(gridState.props.width).toBe(860);
    expect(gridState.props.rowHeight).toBe(72);
    expect(gridState.props.margin).toEqual([16, 16]);
    expect(gridState.props.breakpoints).toEqual({ lg: 1024, md: 768, sm: 480, xs: 0 });
    expect(gridState.props.cols).toEqual({ lg: 12, md: 12, sm: 6, xs: 1 });
    expect(gridState.props.dragConfig).toEqual({ enabled: false, handle: ".dashboard-tile-handle" });
    expect(gridState.props.resizeConfig).toEqual({ enabled: false });
    fireEvent.click(screen.getByText("Customize"));
    expect(gridState.props.dragConfig.enabled).toBe(true);
    expect(gridState.props.resizeConfig.enabled).toBe(true);
    fireEvent.click(screen.getByText("Done"));
    expect(gridState.props.dragConfig.enabled).toBe(false);
    expect(gridState.props.resizeConfig.enabled).toBe(false);
  });
});
