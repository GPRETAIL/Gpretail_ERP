import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";
import { ThemeContext } from "../../../features/theme-context";
import Themes from "../Themes";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("../../../api/axios", () => ({ default: api }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("../../../components/ThemeWorkspacePreview", () => ({ default: ({ brand, mode }) => <div aria-label="Preview probe">{mode}:{brand.theme_style}:{brand.font_family}</div> }));
import { toast } from "react-toastify";

const owner = { id: 1, role: "admin", is_tenant_admin: true, platform_company_code: "CMP-ONE", company_id: null };
const saved = { primary_color: "#123456", font_family: "inter", theme_style: "classic" };
let snapshot, presets, history;
beforeEach(() => {
  vi.clearAllMocks();
  snapshot = { data: saved, meta: { revision: 2, effective: saved, source: "company", override_allowed: true, allowed_store_ids: [], stores: [{ id: 2, name: "Coffee 1" }, { id: 3, name: "Coffee 2" }] } };
  presets = []; history = [];
  api.get.mockImplementation(async url => {
    if (url.endsWith("/theme-presets")) return { data: { data: presets } };
    if (url.endsWith("/theme-history")) return { data: { data: history } };
    if (url === "/companies") return { data: { data: snapshot.meta.stores } };
    if (url === "/auth/me") return { data: { data: { ...owner, brand: saved } } };
    return { data: snapshot };
  });
  api.put.mockResolvedValue({ data: snapshot }); api.post.mockResolvedValue({ data: {} }); api.delete.mockResolvedValue({ data: {} });
});
function show(user = owner, mode = "light") {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { token: "test", user, isAuthenticated: true } } });
  render(<Provider store={store}><ThemeContext.Provider value={{ theme: mode, setTheme: vi.fn() }}><Themes /></ThemeContext.Provider></Provider>);
  return store;
}
const ready = () => screen.findByRole("button", { name: "Apply Theme", exact: true });
const tab = label => fireEvent.click(screen.getByRole("tab", { name: label, exact: true }));
const apply = () => { fireEvent.click(screen.getByRole("button", { name: "Apply Theme", exact: true })); fireEvent.click(screen.getByRole("button", { name: "Confirm Apply" })); };

it("loads company branding without a store and has no duplicate mode control", async () => {
  show(); await ready();
  expect(api.get).toHaveBeenCalledWith("/tenant/theme", expect.any(Object));
  expect(screen.getByRole("combobox", { name: "Theme scope" })).toHaveTextContent("Company Default");
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^light$|^dark$|^system$/i })).not.toBeInTheDocument();
  tab("Brand Colors"); expect(screen.getByLabelText("Primary color hex")).toHaveValue("#123456");
});
it("isolates drafts, confirms affected stores, and publishes with the loaded revision", async () => {
  show(); await ready(); fireEvent.click(screen.getByRole("button", { name: /Liquid AI/i }));
  expect(screen.getByLabelText("Preview probe")).toHaveTextContent("liquid_ai"); expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply Theme", exact: true }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Coffee 1, Coffee 2");
  fireEvent.click(screen.getByRole("button", { name: "Confirm Apply" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/tenant/theme", expect.objectContaining({ theme_style: "liquid_ai", expected_revision: 2, allowed_store_ids: [] }), expect.any(Object)));
});
it("discards a draft without publishing", async () => {
  show(); await ready(); fireEvent.click(screen.getByRole("button", { name: /Liquid AI/i })); fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  expect(screen.getByLabelText("Preview probe")).toHaveTextContent("classic"); expect(api.put).not.toHaveBeenCalled();
});
it("reloads the saved theme after confirming draft discard even when its revision is unchanged", async () => {
  vi.spyOn(window, "confirm").mockReturnValueOnce(true);
  show(); await ready(); fireEvent.click(screen.getByRole("button", { name: /Liquid AI/i }));
  fireEvent.click(screen.getByRole("button", { name: "Reload saved theme" }));
  await waitFor(() => expect(screen.getByLabelText("Preview probe")).toHaveTextContent("classic"));
  expect(api.put).not.toHaveBeenCalled();
});
it("blocks invalid hex and low contrast", async () => {
  show(); await ready(); tab("Brand Colors");
  fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "invalid" } }); expect(screen.getByRole("button", { name: "Apply Theme", exact: true })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "#123456" } });
  fireEvent.change(screen.getByLabelText("Text color hex"), { target: { value: "#ffffff" } });
  expect(screen.getByText(/4.5:1 contrast/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Apply Theme", exact: true })).toBeDisabled();
});
it("uses the header-selected dark mode without overwriting light colors", async () => {
  snapshot.meta.effective = { ...saved, light_colors: { text_color: "#111111" }, dark_colors: { text_color: "#eeeeee" } };
  show(owner, "dark"); await ready(); tab("Brand Colors"); expect(screen.getByLabelText("Text color hex")).toHaveValue("#eeeeee"); apply();
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/tenant/theme", expect.objectContaining({ light_colors: { text_color: "#111111" }, dark_colors: { text_color: "#eeeeee" } }), expect.any(Object)));
});
it("preserves saved Apple and Playfair configurations", async () => {
  snapshot.meta.effective = { ...saved, theme_style: "apple", font_family: "playfair" }; show(); await ready();
  expect(screen.getByRole("button", { name: /Apple \(saved\)/ })).toHaveAttribute("aria-pressed", "true");
  tab("Typography"); expect(screen.getByRole("button", { name: "Playfair Display" })).toHaveAttribute("aria-pressed", "true");
});
it.each(["Segoe UI", "Manrope", "IBM Plex Sans", "Source Sans 3"])("offers %s and keeps font selection as a draft", async label => {
  show(); await ready(); tab("Typography");
  fireEvent.click(screen.getByRole("button", { name: label, exact: true }));
  expect(screen.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(api.put).not.toHaveBeenCalled();
});
it("sends explicit scope when managing a different store", async () => {
  show(); await ready(); fireEvent.mouseDown(screen.getByRole("combobox", { name: "Theme scope" })); fireEvent.click(screen.getByRole("option", { name: "Store Override" }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Store", exact: true })); fireEvent.click(screen.getByRole("option", { name: "Coffee 2" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/companies/3/theme", expect.objectContaining({ storeScopeId: "3" })));
  await ready(); apply(); await waitFor(() => expect(api.put).toHaveBeenCalledWith("/companies/3/theme", expect.any(Object), { storeScopeId: "3" }));
});
it("locks inherited store branding when overrides are disabled", async () => {
  snapshot.meta.override_allowed = false; show({ id: 2, role: "admin", company_id: 2 }); await ready();
  expect(screen.getByRole("button", { name: "Apply Theme", exact: true })).toBeDisabled(); expect(screen.getByText(/locked to company branding/)).toBeInTheDocument();
});
it("publishes override policy only after company confirmation", async () => {
  show(); await ready(); tab("Store Overrides"); fireEvent.click(screen.getByRole("checkbox", { name: "Coffee 1" })); expect(api.put).not.toHaveBeenCalled(); apply();
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/tenant/theme", expect.objectContaining({ allowed_store_ids: [2] }), expect.any(Object)));
});
it("previews presets without applying them and saves named presets separately", async () => {
  presets = [{ id: 8, name: "Ocean", config: { theme_style: "glass" } }]; show(); await ready(); tab("Presets & History"); await screen.findByText("Ocean");
  fireEvent.click(screen.getByRole("button", { name: "Preview Preset" })); expect(screen.getByLabelText("Preview probe")).toHaveTextContent("glass"); expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save Preset", exact: true })); fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "Corporate" } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save Preset" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tenant/theme-presets", expect.objectContaining({ name: "Corporate" }), expect.any(Object))); expect(api.put).not.toHaveBeenCalled();
});
it("restores history through a confirmed revision-checked endpoint", async () => {
  history = [{ id: 9, revision: 1, operation: "baseline", author: "Owner", created_at: "2026-10-23 12:00:00" }]; show(); await ready(); tab("Presets & History");
  fireEvent.click(await screen.findByRole("button", { name: "Restore", exact: true })); expect(api.post).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Confirm Apply" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tenant/theme-history/9/restore", { expected_revision: 2 }, expect.any(Object)));
});
it("keeps the account signed in when workspace refresh fails after saving", async () => {
  const previous = api.get.getMockImplementation(); api.get.mockImplementation(url => url === "/auth/me" ? Promise.reject(new Error("offline")) : previous(url));
  const store = show(); await ready(); apply(); await waitFor(() => expect(toast.warn).toHaveBeenCalledWith(expect.stringContaining("Workspace refresh failed"))); expect(store.getState().auth.token).toBe("test");
});
it("reports conflicts without discarding the draft", async () => {
  api.put.mockRejectedValue({ response: { status: 409 } }); show(); await ready(); fireEvent.click(screen.getByRole("button", { name: /Liquid AI/i })); apply();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Another administrator"))); expect(screen.getByLabelText("Preview probe")).toHaveTextContent("liquid_ai");
});
it("loads earlier history without hiding the current revisions", async () => {
  const previous = api.get.getMockImplementation();
  api.get.mockImplementation((url, config) => url.endsWith("/theme-history") ? Promise.resolve({ data: {
    data: [{ id: config?.params ? 1 : 51, revision: config?.params ? 1 : 51, operation: "apply", author: "Owner" }],
    meta: { next_before: config?.params ? null : 2 },
  } }) : previous(url, config));
  show(); await ready(); tab("Presets & History");
  fireEvent.click(await screen.findByRole("button", { name: "Load Earlier Revisions" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/tenant/theme-history", expect.objectContaining({ params: { before_revision: 2 } })));
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Restore", exact: true })).toHaveLength(2));
  expect(screen.queryByRole("button", { name: "Load Earlier Revisions" })).not.toBeInTheDocument();
});
