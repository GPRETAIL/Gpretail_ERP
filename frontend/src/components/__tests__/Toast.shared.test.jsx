import { StrictMode } from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi, afterEach } from "vitest";
import { ToastContainer, toast } from "react-toastify";
import Toast from "../Toast";

afterEach(() => { toast.dismiss(); toast.clearWaitingQueue(); });

it("renders state-driven Warehouse notices in the same global toast container as Master", async () => {
  const onClose = vi.fn();
  render(<><ToastContainer /><Toast open type="success" message="Saved" onClose={onClose} duration={0} /></>);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Saved");
  expect(alert.closest(".Toastify__toast--success")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /close/i }));
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
});

it("keeps one notice across Strict Mode and callback rerenders, and replaces old messages safely", async () => {
  const firstClose = vi.fn(), currentClose = vi.fn();
  const view = (message, close) => <StrictMode><ToastContainer /><Toast open type="warning" message={message} onClose={close} duration={0} /></StrictMode>;
  const { rerender, unmount } = render(view("Select an item", firstClose));
  await screen.findByText("Select an item");
  rerender(view("Select an item", currentClose));
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  rerender(view("No item selected", currentClose));
  await screen.findByText("No item selected");
  expect(firstClose).not.toHaveBeenCalled();
  expect(currentClose).not.toHaveBeenCalled();
  unmount();
  expect(currentClose).not.toHaveBeenCalled();
});
