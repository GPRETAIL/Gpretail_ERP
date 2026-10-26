import { afterEach, expect, it, vi } from "vitest";
import { prepareCheckoutAttempt } from "../posCheckoutAttempt";

const payload = { saleAt: "2026-10-26T10:00:00Z", cashAmount: 100, items: [{ productId: 1, qty: 1, price: 100 }] };
afterEach(() => vi.unstubAllGlobals());

it("also produces a valid UUID on HTTP LAN deployments without randomUUID", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const attempt = prepareCheckoutAttempt(null, payload, [1, 2]);
  expect(attempt.payload.checkoutKey).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

it("reuses the original key, timestamp and node for an unchanged checkout retry", () => {
  const first = prepareCheckoutAttempt(null, payload, [1, 2]);
  first.target = "local";
  const retry = prepareCheckoutAttempt(first, { ...payload, saleAt: "2026-10-26T10:00:01Z" }, [1, 2]);
  expect(retry).toBe(first);
  expect(retry.payload.checkoutKey).toMatch(/^[a-f0-9-]{36}$/);
  expect(retry.payload.saleAt).toBe(payload.saleAt);
  expect(retry.target).toBe("local");
});

it("creates a fresh attempt for a new basket, payment, user/store scope, or confirmed save", () => {
  const first = prepareCheckoutAttempt(null, payload, [1, 2]);
  for (const [previous, next, scope] of [[first, { ...payload, cashAmount: 200 }, [1, 2]], [first, { ...payload, items: [{ productId: 2, qty: 1, price: 100 }] }, [1, 2]], [first, payload, [1, 3]], [null, payload, [1, 2]]]) {
    expect(prepareCheckoutAttempt(previous, next, scope).payload.checkoutKey).not.toBe(first.payload.checkoutKey);
  }
});
