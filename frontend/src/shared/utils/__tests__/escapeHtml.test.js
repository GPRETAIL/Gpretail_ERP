import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/shared/utils/escapeHtml";

describe("escapeHtml", () => {
  it("turns markup in a name into plain text", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')"> & Co`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; Co");
  });
  it("prints nothing for null or undefined, and keeps numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});
