import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ModulePage from "../ModulePage";

const createMockStore = (userRole = "super_admin") =>
  configureStore({
    reducer: {
      auth: (state = { user: { id: 1, role: userRole, company_id: 1 } }) => state,
    },
  });

describe("ModulePage", () => {
  it("displays HRMS card on the All Modules hub page (/modules)", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/modules"]}>
          <Routes>
            <Route path="/:moduleName" element={<ModulePage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByRole("heading", { name: /all modules/i })).toBeInTheDocument();
    expect(screen.getByText("HRMS")).toBeInTheDocument();
    expect(screen.getByText("Warehouse")).toBeInTheDocument();
    expect(screen.getByText("Masters")).toBeInTheDocument();
  });

  it("displays HRMS subitems when viewing /hrms", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/hrms"]}>
          <Routes>
            <Route path="/:moduleName" element={<ModulePage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText("HRMS")).toBeInTheDocument();
    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(screen.getByText("HR Configuration")).toBeInTheDocument();
  });
});
