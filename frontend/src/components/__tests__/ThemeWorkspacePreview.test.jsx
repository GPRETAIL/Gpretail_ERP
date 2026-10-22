import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { expect, it } from "vitest";
import ThemeWorkspacePreview from "../ThemeWorkspacePreview";

it("keeps draft styling and dialog portals inside the isolated preview document", async () => {
  const previousStyle = document.documentElement.dataset.themeStyle;
  const { getByTitle, rerender } = render(<ThemeWorkspacePreview brand={{ theme_style: "glass", primary_color: "#123456", font_family: "system" }} mode="light" />);
  const frame = getByTitle("Isolated ERP theme preview");
  expect(frame).toHaveAttribute("sandbox", "allow-same-origin");
  // jsdom does not parse iframe srcDoc; supply the same static mount point before its load event.
  frame.contentDocument.body.innerHTML = '<main id="preview"></main>';
  fireEvent.load(frame);
  const preview = within(frame.contentDocument.body);
  await preview.findByText("Cotton Shirt");
  expect(frame.contentDocument.documentElement.dataset.themeStyle).toBe("glass");
  expect(document.documentElement.dataset.themeStyle).toBe(previousStyle);
  fireEvent.click(preview.getByRole("button", { name: "New", exact: true }));
  await preview.findByRole("dialog");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  fireEvent.click(preview.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(preview.queryByRole("dialog")).toBeNull());
  rerender(<ThemeWorkspacePreview brand={{ theme_style: "liquid_ai", font_family: "system" }} mode="dark" />);
  expect(frame.contentDocument.documentElement.classList.contains("dark")).toBe(true);
  expect(frame.contentDocument.documentElement.dataset.themeStyle).toBe("liquid_ai");
  expect(document.documentElement.dataset.themeStyle).toBe(previousStyle);
});
