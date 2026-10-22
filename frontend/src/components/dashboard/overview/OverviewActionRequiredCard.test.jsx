import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OverviewActionRequiredCard from "./OverviewActionRequiredCard";
vi.mock("../../../api/axios", () => ({ default: { post: vi.fn(() => new Promise(() => {})) } }));
afterEach(cleanup);
it.each(["/finance/supplier-payment", null])("opens the destination immediately even when the read receipt never responds: %s", (link) => {
  render(<MemoryRouter><Routes><Route path="/" element={<OverviewActionRequiredCard items={[{ id: 1, title: "Open notice", message: "Read details", link }]} />} /><Route path={link || "/notifications"} element={<div>Destination opened</div>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Open notice/ }));
  expect(screen.getByText("Destination opened")).toBeInTheDocument();
});


