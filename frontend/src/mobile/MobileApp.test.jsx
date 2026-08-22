import { describe, expect, it } from "vitest";

import MobileApp from "./MobileApp";

describe("MobileApp", () => {
  it("exports the standalone responsive PWA shell", () => {
    expect(typeof MobileApp).toBe("function");
  });
});
