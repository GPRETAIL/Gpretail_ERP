import { describe, it, expect } from "vitest";
import { applyTypographyPreset, getTextSizeOption } from "../themeRegistry";
import { normalizeTheme, themePayload } from "../themeWorkspace";

describe("tenant typography", () => {
  it("round-trips saved size choices and defaults older themes safely", () => {
    expect(normalizeTheme({}).text_size).toBe("comfortable");
    expect(normalizeTheme({ text_size: "invalid" }).text_size).toBe("comfortable");
    expect(themePayload(normalizeTheme({ text_size: "large" })).text_size).toBe("large");
  });
  it("replaces all screen tokens when switching presets", () => {
    const root = document.createElement("div");
    applyTypographyPreset(root, "large");
    expect(root.style.getPropertyValue("--erp-font-body")).toBe("16px");
    applyTypographyPreset(root, "compact");
    expect(root.dataset.textSize).toBe("compact");
    expect(root.style.getPropertyValue("--erp-font-heading")).toBe("16px");
    expect(getTextSizeOption("bad").id).toBe("comfortable");
  });
});
