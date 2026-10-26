import { expect, it, vi } from "vitest";
import { loadLatestPosDocument } from "../posLatestDocument";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: { get } }));

it("uses one lightweight request for the last bill instead of four list requests", async () => {
  get.mockResolvedValue({ data: { data: { id: 5, type: "sale", bill_no: "261027-0005", grand_total: 123, documentAt: "2026-10-27T00:00:00Z" } } });
  const bill = await loadLatestPosDocument();
  expect(get).toHaveBeenCalledExactlyOnceWith("/pos-sales/latest-document");
  expect(bill.amount).toBe(123);
  expect(bill.documentAt).toBe("2026-10-27T00:00:00Z");
});
