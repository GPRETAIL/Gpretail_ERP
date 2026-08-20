import { configureStore } from "@reduxjs/toolkit";
import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";

/**
 * Render smoke tests for the master pages.
 *
 * These exist because three temporal-dead-zone crashes shipped to production
 * ("Uncaught ReferenceError: Cannot access 'H'/'b' before initialization", white-screening the app)
 * and nothing caught them: the code built cleanly, the strings were present in the bundle, and there
 * were no frontend tests at all. A TDZ throws while React renders, so simply mounting each page
 * catches the entire class — a hook whose dependency array reads state declared below it will fail
 * here instead of in the user's browser.
 */

// Every master page (and useStoreNameMap) calls the API on mount.
vi.mock("../../../api/axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
  },
}));

import { TransferActivityProvider } from "../../../context/TransferActivityContext";
import AddAttributePage from "../AddAttributePage";
import Agent from "../Agent";
import Brand from "../Brand";
import Employee from "../Employee";
import Item from "../Item";
import Supplier from "../Supplier";
import Tax from "../Tax";
import Transport from "../Transport";

const pages = [
  ["Agent", Agent],
  ["Supplier", Supplier], // TDZ regression: effect read formData above its declaration
  ["Employee", Employee], // TDZ regression: same
  ["AddAttributePage", AddAttributePage], // TDZ regression: effect read sizeList above its declaration
  ["Brand", Brand],
  ["Item", Item],
  ["Tax", Tax],
  ["Transport", Transport],
];

describe("master pages render without crashing", () => {
  it.each(pages)("%s mounts (no TDZ / render-time throw)", async (_name, Page) => {
    // Real authReducer, not a hand-rolled mock, so this store's shape can never drift
    // from src/store.js. Brand reads useSelector(state => state.auth.user) to decide
    // whether to show the super-admin store picker — react-redux throws at render time
    // if a connected component mounts outside a <Provider>, regardless of what the
    // selector itself does, so every page needs the wrapper even though only Brand uses it.
    const store = configureStore({ reducer: { auth: authReducer } });
    expect(() =>
      render(
        <Provider store={store}>
          <MemoryRouter>
            <TransferActivityProvider>
              <Page />
            </TransferActivityProvider>
          </MemoryRouter>
        </Provider>
      )
    ).not.toThrow();

    // Every page fetches on mount. Those (mocked) promises resolve on a later microtask, so without
    // this the resulting setState lands after the test body has returned and React logs
    // "An update to <Page> inside a test was not wrapped in act(...)". Draining them inside act()
    // both silences that and makes the smoke test cover the post-fetch render, where a TDZ in a
    // data-dependent effect would actually surface.
    await act(async () => {});
  });
});
