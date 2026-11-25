import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import SearchableSelect from "@/shared/components/SearchableSelect";
import AsyncSearchSelect from "@/shared/components/AsyncSearchSelect";

afterEach(cleanup);

const OPTIONS = [{ value: "1", label: "Cotton Shirt" }, { value: "2", label: "Denim Jeans" }];

// The old Tailwind reset used to hide the browser's list bullets; without list-style: none every dropdown row shows a dot.
// jsdom does not compute the list-style shorthand, so this reads the style rule generated for the list itself.
const ruleFor = (css, name) => {
  const start = css.indexOf("." + name + "{");
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start) + 1);
};
const styleOf = (element) => {
  const css = [...document.querySelectorAll("style")].map((tag) => tag.textContent).join(" ");
  return [...element.classList].map((name) => ruleFor(css, name)).join("");
};
const expectNoBullets = (list) => {
  expect(styleOf(list)).toMatch(/list-style:\s*none/);
  expect(styleOf(list)).toMatch(/padding:\s*0/);
};

it("SearchableSelect rows have no bullets and no indent", () => {
  render(<SearchableSelect name="item" value="" onChange={() => {}} options={OPTIONS} placeholder="Choose item" />);
  fireEvent.click(screen.getByText("Choose item"));
  const list = screen.getByText("Cotton Shirt").closest("ul");
  expect(list).not.toBeNull();
  expectNoBullets(list);
});

it("AsyncSearchSelect rows have no bullets and no indent", () => {
  render(<AsyncSearchSelect name="product" value="" onChange={() => {}} options={OPTIONS} onAsyncSearch={() => {}} placeholder="Select product" />);
  fireEvent.click(screen.getByText("Select product"));
  const list = screen.getByText("Cotton Shirt").closest("ul");
  expect(list).not.toBeNull();
  expectNoBullets(list);
});
