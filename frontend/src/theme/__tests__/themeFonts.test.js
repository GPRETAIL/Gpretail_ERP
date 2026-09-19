import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_FONT, FONT_OPTIONS, ensureGoogleFontLoaded, getFontOption } from "../themeRegistry";

afterEach(() => {
  document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((link) => link.remove());
});

describe("getFontOption", () => {
  it("resolves a known font id", () => {
    expect(getFontOption("inter").label).toBe("Inter");
  });

  it("falls back to the default font for an unset or unrecognized id", () => {
    expect(getFontOption(undefined).id).toBe(DEFAULT_FONT);
    expect(getFontOption("comic-sans").id).toBe(DEFAULT_FONT);
  });

  it("the default font needs no network request", () => {
    expect(getFontOption(DEFAULT_FONT).google).toBeNull();
  });
});

describe("ensureGoogleFontLoaded", () => {
  it("injects a stylesheet link for a Google Fonts family segment", () => {
    ensureGoogleFontLoaded("Inter:wght@400;500;600;700");

    const link = document.querySelector('link[href*="fonts.googleapis.com"]');
    expect(link).toBeTruthy();
    expect(link.href).toContain("family=Inter:wght@400;500;600;700");
  });

  it("does nothing for a null segment (the system/default font)", () => {
    ensureGoogleFontLoaded(null);

    expect(document.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();
  });

  it("never injects the same family segment twice", () => {
    ensureGoogleFontLoaded("Roboto:wght@400;500;700");
    ensureGoogleFontLoaded("Roboto:wght@400;500;700");

    expect(document.querySelectorAll('link[href*="family=Roboto"]')).toHaveLength(1);
  });
});

describe("FONT_OPTIONS", () => {
  it("every non-default option declares a Google Fonts family to load", () => {
    FONT_OPTIONS.filter((opt) => opt.id !== DEFAULT_FONT).forEach((opt) => {
      expect(opt.google).toBeTruthy();
    });
  });
});
