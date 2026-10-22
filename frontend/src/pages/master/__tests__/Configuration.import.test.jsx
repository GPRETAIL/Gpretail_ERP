import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ props: null }));
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));
vi.mock("../../../components/UploadImportButton", () => ({ default: (props) => { mocks.props = props; return null; } }));
import ConfigurationForm from "../ConfigurationForm";
it("includes the selected configuration fields in the template and keeps them as extra_data", () => {
  render(<MemoryRouter initialEntries={["/masters/configuration?type=LOCATION"]}><ConfigurationForm /></MemoryRouter>);
  expect(mocks.props.fieldConfig.preserveUnknown).toBe(true);
  expect(mocks.props.fieldConfig.sampleHeaders).toContain("gst_no");
  expect(mocks.props.fieldConfig.boolFields).toContain("is_warehouse");
  expect(mocks.props.transform({ code: "LOC", name: "Location", sortOrder: 2, is_active: false, gst_no: "GST-LOC", is_warehouse: false, pincode: "00001" })).toEqual({ code: "LOC", name: "Location", sort_order: 2, is_active: false, extra_data: { gst_no: "GST-LOC", is_warehouse: false, pincode: "00001" } });
});
