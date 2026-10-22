import { describe, expect, it } from "vitest";
import { dropdownPlacement } from "../dropdownPlacement";

describe("searchable dropdown viewport placement", () => {
  it("clamps a right-edge field's menu inside a narrow phone", () => {
    const result = dropdownPlacement({ left: 250, top: 100, bottom: 130, width: 120 }, 320, 640);
    expect(result.left).toBeGreaterThanOrEqual(8);
    expect(result.left + result.width).toBeLessThanOrEqual(312);
    expect(result.top).toBe(134);
  });

  it("opens above a field near the bottom instead of clipping its options", () => {
    const result = dropdownPlacement({ left: 20, top: 570, bottom: 600, width: 280 }, 320, 640);
    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + result.maxHeight + 48).toBeLessThan(570);
  });

  it("caps an oversized trigger width and handles a short viewport", () => {
    const result = dropdownPlacement({ left: -20, top: 80, bottom: 110, width: 500 }, 280, 180);
    expect(result.width).toBe(264);
    expect(result.left).toBe(8);
    expect(result.top + result.maxHeight + 48).toBeLessThanOrEqual(172);
  });
});
