import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, expect, it, vi } from "vitest";
import ActivationGate from "../ActivationGate";

vi.mock("../../pages/ActivationWizard", () => ({ default: () => <div>Activation form</div> }));

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

it("moves between mobile and desktop gates without changing hook order", async () => {
  const fetchStatus = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { activated: true } }) });
  vi.stubGlobal("fetch", fetchStatus);
  const store = configureStore({ reducer: { auth: () => ({ isAuthenticated: true }) } });
  const content = <Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>;
  window.history.replaceState({}, "", "/app");
  const view = render(content);
  expect(screen.getByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).not.toHaveBeenCalled();
  window.history.replaceState({}, "", "/dashboard");
  view.rerender(<Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>);
  expect(await screen.findByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  window.history.replaceState({}, "", "/app");
  view.rerender(<Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>);
  expect(screen.getByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).toHaveBeenCalledTimes(1);
});
