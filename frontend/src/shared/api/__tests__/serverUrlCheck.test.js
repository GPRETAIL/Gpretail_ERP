import { describe, expect, it } from "vitest";
import { serverUrlProblem } from "../serverUrlCheck";

describe("serverUrlProblem", () => {
  it("accepts a backend LAN address, with or without /api", () => {
    expect(serverUrlProblem("http://192.168.1.25:8000", { local: true })).toBe("");
    expect(serverUrlProblem("http://192.168.1.25:8000/api/", { local: true })).toBe("");
    expect(serverUrlProblem("")).toBe("");
  });

  it("refuses frontend ports, loopback for the local server, page paths and credentials", () => {
    expect(serverUrlProblem("http://192.168.1.25:5173")).toMatch(/frontend preview port/);
    expect(serverUrlProblem("http://127.0.0.1:8000", { local: true })).toMatch(/LAN address/);
    expect(serverUrlProblem("http://[::1]:8000", { local: true })).toMatch(/LAN address/);
    expect(serverUrlProblem("http://127.0.0.1:8000")).toBe(""); // Loopback is only refused for the local failover server.
    expect(serverUrlProblem("http://192.168.1.25:8000/login")).toMatch(/server address only/);
    expect(serverUrlProblem("http://user:pw@192.168.1.25:8000")).toMatch(/without credentials/);
    expect(serverUrlProblem("not a url")).toMatch(/valid server address/);
  });
});
