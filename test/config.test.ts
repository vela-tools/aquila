import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config";

const DEFAULT = { brokerName: "Local broker", brokerUrl: "http://localhost:9090/ngsi-ld/v1" };

function serve(response: Response | Error) {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
        if (response instanceof Error) throw response;
        return response;
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("loadConfig", () => {
    it("reads the broker from /config.json without caching it", async () => {
        const fetch = serve(json({ brokerName: "City broker", brokerUrl: "https://broker.example/ngsi-ld/v1" }));
        await expect(loadConfig()).resolves.toEqual({
            brokerName: "City broker",
            brokerUrl: "https://broker.example/ngsi-ld/v1",
        });
        expect(fetch).toHaveBeenCalledWith("/config.json", { cache: "no-store" });
    });

    it("trims the values", async () => {
        serve(json({ brokerName: "  City broker ", brokerUrl: " https://broker.example/ngsi-ld/v1\n" }));
        await expect(loadConfig()).resolves.toEqual({
            brokerName: "City broker",
            brokerUrl: "https://broker.example/ngsi-ld/v1",
        });
    });

    it("falls back per value when one is empty, blank, missing or not a string", async () => {
        serve(json({ brokerName: "   ", brokerUrl: 9090 }));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
        serve(json({ brokerName: "", brokerUrl: "https://broker.example/ngsi-ld/v1" }));
        await expect(loadConfig()).resolves.toEqual({
            brokerName: "Local broker",
            brokerUrl: "https://broker.example/ngsi-ld/v1",
        });
        serve(json({ brokerName: "City broker" }));
        await expect(loadConfig()).resolves.toEqual({ brokerName: "City broker", brokerUrl: DEFAULT.brokerUrl });
    });

    it("falls back when the file is missing", async () => {
        serve(new Response("Not found", { status: 404 }));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
    });

    it("falls back when the file is not JSON or not an object", async () => {
        serve(new Response("<html></html>", { status: 200 }));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
        serve(json(null));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
        serve(json(["https://broker.example/ngsi-ld/v1"]));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
    });

    it("falls back when the request fails", async () => {
        serve(new TypeError("Failed to fetch"));
        await expect(loadConfig()).resolves.toEqual(DEFAULT);
    });
});
