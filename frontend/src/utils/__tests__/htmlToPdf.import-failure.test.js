import { expect, it, vi } from "vitest";
import { downloadHtmlAsPdf } from "../htmlToPdf";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => { throw new Error("PDF module unavailable"); });

it("reports a deferred PDF import failure without leaving a receipt iframe behind", async () => {
  // Vitest wraps a rejected mock-module factory; its cause retains the import failure.
  await expect(downloadHtmlAsPdf("<p>Saved invoice</p>", "receipt.pdf")).rejects.toMatchObject({
    cause: expect.objectContaining({ message: "PDF module unavailable" }),
  });
  expect(document.querySelectorAll("iframe")).toHaveLength(0);
});
