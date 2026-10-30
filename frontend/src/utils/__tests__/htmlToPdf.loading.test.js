import { expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({ canvasLoads: 0, pdfLoads: 0 }));
vi.mock("html2canvas", () => {
  dependencies.canvasLoads++;
  return { default: vi.fn() };
});
vi.mock("jspdf", () => {
  dependencies.pdfLoads++;
  return { jsPDF: vi.fn() };
});

it("loads PDF rendering libraries only when a PDF is requested", async () => {
  const { downloadHtmlAsPdf } = await import("../htmlToPdf");
  expect(dependencies).toEqual({ canvasLoads: 0, pdfLoads: 0 });

  // Stop before document rendering; this verifies the action boundary without a real canvas.
  const create = vi.spyOn(document, "createElement").mockImplementation(() => {
    throw new Error("Receipt document unavailable");
  });
  try {
    await expect(downloadHtmlAsPdf("<p>Receipt</p>", "receipt.pdf")).rejects.toThrow("Receipt document unavailable");
    expect(dependencies).toEqual({ canvasLoads: 1, pdfLoads: 1 });
  } finally {
    create.mockRestore();
  }
});
