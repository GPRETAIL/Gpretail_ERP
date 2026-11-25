import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import InfoHint from "../InfoHint";

afterEach(cleanup);

it("keeps the text out of the page until the i is clicked, then shows it and closes with Escape", () => {
  render(<InfoHint label="About sales numbers">Applies only to new sales.</InfoHint>);
  expect(screen.queryByText("Applies only to new sales.")).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: "About sales numbers" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "About sales numbers" })).toBeVisible();
  expect(screen.getByText("Applies only to new sales.")).toBeVisible();
  expect(button).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
});

it("does not trigger a click on the row or card it sits in", () => {
  let clicks = 0;
  render(<div onClick={() => { clicks += 1; }}><InfoHint>Help</InfoHint></div>);
  fireEvent.click(screen.getByRole("button", { name: "More information" }));
  expect(clicks).toBe(0);
});
