import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SummaryLayoutsDrawer, { SummaryPanelRow } from "@/shared/components/SummaryLayoutsDrawer";

const options = [{ value: "item", label: "Item" }];
const renderPanel = (props) => render(
  <SummaryPanelRow panel={<SummaryLayoutsDrawer open options={options} mode="item" onModeChange={() => {}} from="" to="" onRangeChange={() => {}} {...props} />}>
    <div data-testid="report-table">table</div>
  </SummaryPanelRow>
);

beforeEach(() => localStorage.removeItem("erp.report.summaryPanelPinned"));
afterEach(cleanup);

it("unpinned, Apply closes the panel; a failed Apply keeps it open", async () => {
  const onClose = vi.fn();
  const onApply = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(undefined);
  renderPanel({ onClose, onApply });
  fireEvent.click(screen.getByRole("button", { name: "Apply breakdown" }));
  await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply breakdown" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("pinned, it docks beside the table, stays open after Apply, and is remembered", async () => {
  const onClose = vi.fn();
  const onApply = vi.fn().mockResolvedValue(undefined);
  const { container, unmount } = renderPanel({ onClose, onApply });
  fireEvent.click(screen.getByRole("button", { name: "Pin panel" }));

  const docked = screen.getByRole("complementary", { name: "Summary layouts" });
  expect(docked.parentElement).toBe(screen.getByTestId("report-table").parentElement.parentElement); // In the row, beside the table.
  expect(container.querySelector('[role="presentation"]')).toBeNull(); // No backdrop over the page.
  fireEvent.click(screen.getByRole("button", { name: "Apply breakdown" }));
  await waitFor(() => expect(onApply).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
  expect(localStorage.getItem("erp.report.summaryPanelPinned")).toBe("1");
  unmount();

  renderPanel({ onClose, onApply });
  expect(screen.getByRole("button", { name: "Unpin panel" })).toHaveAttribute("aria-pressed", "true");
});
