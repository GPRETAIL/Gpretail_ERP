import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const toast = vi.hoisted(() => ({ warning: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: api }));
vi.mock("react-toastify", () => ({ toast }));

import HrConfigurationForm from "@/features/hr/HrConfigurationForm";

// Working Hour: the full-day and half-day hours that decide Present / Half day / Absent from check-in to check-out.

const renderForm = () => {
  const view = render(
    <MemoryRouter initialEntries={["/hrms/hr-configuration/new?type=working_hour"]}>
      <Routes>
        <Route path="/hrms/hr-configuration/new" element={<HrConfigurationForm />} />
        <Route path="/hrms/hr-configuration" element={<div>list</div>} />
      </Routes>
    </MemoryRouter>
  );
  const field = (name) => view.container.querySelector(`input[name="${name}"]`);
  const fill = (values) => Object.entries(values).forEach(([name, value]) => fireEvent.change(field(name), { target: { name, value } }));
  return { ...view, fill };
};

const valid = { name: "General shift", fromTime: "09:30", toTime: "18:30", workingHours: "09:00", minimumFullDay: "07:00", minimumPresent: "04:00" };

describe("Working Hour form — full day and half day hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { success: true } });
  });

  it("labels the two thresholds as Full Day Hours and Half Day Hours, with what each one means", () => {
    renderForm();
    expect(screen.getByText(/Full Day Hours \[hh:mm\]/)).toBeInTheDocument();
    expect(screen.getByText(/Half Day Hours \[hh:mm\]/)).toBeInTheDocument();
    expect(screen.getByText(/counts as a full day/)).toBeInTheDocument();
    expect(screen.getByText(/counts as a half day\. Less than this is absent/)).toBeInTheDocument();
    expect(screen.queryByText(/Minimum Present/)).not.toBeInTheDocument();
  });

  it("refuses a half day that is not shorter than the full day", () => {
    const { fill } = renderForm();
    fill({ ...valid, minimumPresent: "07:00" });
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(toast.warning).toHaveBeenCalledWith("Half Day Hours must be less than Full Day Hours");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("saves 7 hours full day and 4 hours half day", async () => {
    const { fill } = renderForm();
    fill(valid);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).toMatchObject({ minimumFullDay: "07:00", minimumPresent: "04:00" });
  });
});
