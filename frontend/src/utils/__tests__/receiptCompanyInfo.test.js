import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("../../api/axios", () => ({
  default: { get: (...args) => getMock(...args) },
}));

// Fresh module registry per test so the module-level cache Map doesn't leak between tests -
// vi.resetModules() + a dynamic re-import is the standard way to get a clean singleton.
const importFresh = async () => {
  vi.resetModules();
  return import("../receiptCompanyInfo");
};

describe("fetchReceiptCompanyInfo", () => {
  it("does not reuse another login's receipt details for the same numeric store ID", async () => {
    const { fetchReceiptCompanyInfo } = await importFresh();
    localStorage.setItem("token", "receipt-first-login");
    getMock.mockResolvedValueOnce({ data: { data: { name: "First store" } } });
    expect((await fetchReceiptCompanyInfo(7)).storeName).toBe("First store");
    localStorage.setItem("token", "receipt-second-login");
    getMock.mockResolvedValueOnce({ data: { data: { name: "Second store" } } });
    expect((await fetchReceiptCompanyInfo(7)).storeName).toBe("Second store");
    expect(getMock).toHaveBeenCalledTimes(2);
    localStorage.removeItem("token");
  });
  beforeEach(() => {
    getMock.mockReset();
    sessionStorage.clear();
  });

  it("uses the saved document store ahead of the selected store and tenant account", async () => {
    const { getReceiptCompanyId, requireReceiptStoreName } = await importFresh();
    sessionStorage.setItem("activeStoreId", "9");
    expect(getReceiptCompanyId({ company_id: 7 }, { company_id: 1 })).toBe(7);
    expect(getReceiptCompanyId(null, { company_id: 1 })).toBe("9");
    expect(requireReceiptStoreName({ storeName: " Coffee Branch " })).toBe("Coffee Branch");
    expect(() => requireReceiptStoreName({ storeName: "" })).toThrow("Store name is unavailable");
  });

  it("returns blank info without calling the API when there is no company id", async () => {
    const { fetchReceiptCompanyInfo } = await importFresh();
    const info = await fetchReceiptCompanyInfo(0);

    expect(info).toEqual({ storeName: "", storeAddress: "", storePhone: "", storeGstNo: "" });
    expect(getMock).not.toHaveBeenCalled();
  });

  it("fetches and normalizes company info on a cache miss", async () => {
    getMock.mockResolvedValue({
      data: { data: { name: "SRI BALAJI TEXTILE", address: "Main Bazaar", contact_no: "9876543210", gst_no: "33AAAAA0000A1Z5" } },
    });
    const { fetchReceiptCompanyInfo } = await importFresh();

    const info = await fetchReceiptCompanyInfo(7);

    expect(getMock).toHaveBeenCalledWith("/companies/7");
    expect(info).toEqual({
      storeName: "SRI BALAJI TEXTILE",
      storeAddress: "Main Bazaar",
      storePhone: "9876543210",
      storeGstNo: "33AAAAA0000A1Z5",
    });
  });

  it("falls back through the camelCase field variants when the snake_case ones are absent", async () => {
    getMock.mockResolvedValue({
      data: { data: { reg_name: "Fallback Name", contactNo: "111", gstNo: "GST1" } },
    });
    const { fetchReceiptCompanyInfo } = await importFresh();

    const info = await fetchReceiptCompanyInfo(7);

    expect(info).toEqual({ storeName: "Fallback Name", storeAddress: "", storePhone: "111", storeGstNo: "GST1" });
  });

  // The whole point of this module: every receipt print previously re-fetched company info from
  // scratch, adding a redundant network round-trip between "sale saved" and "print job queued".
  it("serves a second call for the same company id from cache instead of calling the API again", async () => {
    getMock.mockResolvedValue({ data: { data: { name: "Store A" } } });
    const { fetchReceiptCompanyInfo } = await importFresh();

    await fetchReceiptCompanyInfo(7);
    await fetchReceiptCompanyInfo(7);

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("keeps per-company caches separate", async () => {
    getMock.mockImplementation((url) =>
      Promise.resolve({ data: { data: { name: url.endsWith("/7") ? "Store 7" : "Store 9" } } })
    );
    const { fetchReceiptCompanyInfo } = await importFresh();

    const info7 = await fetchReceiptCompanyInfo(7);
    const info9 = await fetchReceiptCompanyInfo(9);

    expect(info7.storeName).toBe("Store 7");
    expect(info9.storeName).toBe("Store 9");
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed request, so the next print attempt tries again", async () => {
    getMock.mockRejectedValueOnce(new Error("network down"));
    getMock.mockResolvedValueOnce({ data: { data: { name: "Recovered" } } });
    const { fetchReceiptCompanyInfo } = await importFresh();

    const failed = await fetchReceiptCompanyInfo(7);
    expect(failed).toEqual({ storeName: "", storeAddress: "", storePhone: "", storeGstNo: "" });

    const recovered = await fetchReceiptCompanyInfo(7);
    expect(recovered.storeName).toBe("Recovered");
    expect(getMock).toHaveBeenCalledTimes(2);
  });
  it("shares a preloaded company request with checkout printing", async () => {
    const { fetchReceiptCompanyInfo } = await importFresh();
    let resolve;
    getMock.mockReturnValue(new Promise(done => { resolve = done; }));
    const prefetch = fetchReceiptCompanyInfo(91);
    const printing = fetchReceiptCompanyInfo(91);
    expect(getMock).toHaveBeenCalledTimes(1);
    resolve({ data: { data: { name: "Coffee" } } });
    expect(await prefetch).toEqual(await printing);
  });
});
