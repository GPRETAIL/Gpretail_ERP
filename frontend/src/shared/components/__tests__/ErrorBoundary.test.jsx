import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/shared/api/apiClient";
import ErrorBoundary from "@/shared/components/ErrorBoundary";

vi.mock("@/shared/api/apiClient", () => ({
  default: { post: vi.fn(() => Promise.resolve({ data: { success: true } })) },
}));

let reload;
const originalLocation = window.location;
let errorSpy;

beforeEach(() => {
  reload = vi.fn();
  Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, pathname: "/dashboard", reload, assign: vi.fn() } });
  localStorage.setItem("token", "test-token");
  sessionStorage.clear();
  api.post.mockClear();
  // React logs every caught render error; keep the test output readable.
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  localStorage.removeItem("token");
  errorSpy.mockRestore();
});

let uniq = 0;
const Boom = ({ when = true, message }) => {
  if (when) throw new Error(message);
  return <div>Page content</div>;
};

it("a page crash shows an honest message with a reference, reported to the server once", () => {
  const message = `page broke ${++uniq}`;
  render(<ErrorBoundary variant="page" where="page:/dashboard" homePath="/dashboard"><Boom message={message} /></ErrorBoundary>);
  expect(screen.getByText("Something went wrong on this page.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Go to Dashboard" })).toBeInTheDocument();
  const reference = screen.getByText(/^Reference E-[A-Z0-9]{5}$/).textContent.replace("Reference ", "");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/client-errors", expect.objectContaining({ reference, message, where: "page:/dashboard", path: "/dashboard" }));
  expect(reload).not.toHaveBeenCalled();
});

it("Try again recovers once the cause is gone", () => {
  let broken = true;
  const Flaky = () => <Boom when={broken} message={`flaky ${++uniq}`} />;
  render(<ErrorBoundary variant="page"><Flaky /></ErrorBoundary>);
  expect(screen.getByText("Something went wrong on this page.")).toBeInTheDocument();
  broken = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Page content")).toBeInTheDocument();
});

it("moving to another page (resetKeys change) clears the error", () => {
  const message = `path ${++uniq}`;
  const { rerender } = render(<ErrorBoundary variant="page" resetKeys={["/broken"]}><Boom message={message} /></ErrorBoundary>);
  expect(screen.getByText("Something went wrong on this page.")).toBeInTheDocument();
  rerender(<ErrorBoundary variant="page" resetKeys={["/working"]}><Boom when={false} /></ErrorBoundary>);
  expect(screen.getByText("Page content")).toBeInTheDocument();
});

it("a widget crash shows a small card and leaves the other widgets showing", () => {
  render(
    <div>
      <ErrorBoundary variant="widget" where="dashboard:hrms:a"><Boom message={`widget ${++uniq}`} /></ErrorBoundary>
      <ErrorBoundary variant="widget" where="dashboard:hrms:b"><div>Other widget</div></ErrorBoundary>
    </div>
  );
  expect(screen.getByText("This section could not be shown.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  expect(screen.getByText("Other widget")).toBeInTheDocument();
});

it("a new-version (chunk) error reloads once, then shows Refresh instead of looping, and is not reported", () => {
  const chunk = "Failed to fetch dynamically imported module: /assets/Page-abc.js";
  const first = render(<ErrorBoundary variant="page"><Boom message={chunk} /></ErrorBoundary>);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem("vx_chunk_reload_attempted")).toBe("1");
  first.unmount();

  render(<ErrorBoundary variant="page"><Boom message={chunk} /></ErrorBoundary>);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(screen.getByText("A new version of Vynerix is available.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("the same crash twice within a minute is reported once", () => {
  const message = `repeat ${++uniq}`;
  const a = render(<ErrorBoundary variant="widget" where="w"><Boom message={message} /></ErrorBoundary>);
  a.unmount();
  render(<ErrorBoundary variant="widget" where="w"><Boom message={message} /></ErrorBoundary>);
  expect(api.post).toHaveBeenCalledTimes(1);
});
