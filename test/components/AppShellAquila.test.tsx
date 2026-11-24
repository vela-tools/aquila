import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMockNgsiAdapter } from "@vela-tools/ngsi/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AquilaProviders } from "../../src/AquilaProviders";
import { AppShellAquila } from "../../src/components/AppShellAquila";

const config = { brokerName: "Test broker", brokerUrl: "https://broker.example/ngsi-ld/v1" };

function renderApp() {
    const createAdapters = vi.fn(() => createMockNgsiAdapter());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <AquilaProviders config={config} createAdapters={createAdapters} queryClient={queryClient}>
            <AppShellAquila />
        </AquilaProviders>,
    );
    return { createAdapters };
}

const stat = (label: string) => screen.getByText(label, { selector: "p" }).parentElement!;

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe("Aquila", () => {
    it("connects to the configured broker", async () => {
        const { createAdapters } = renderApp();
        expect(await screen.findAllByText("Test broker")).not.toHaveLength(0);
        expect(createAdapters).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Test broker", url: "https://broker.example/ngsi-ld/v1" }),
        );
    });

    it("shows the subscription counts from the broker", async () => {
        renderApp();
        expect(await within(stat("Subscriptions")).findByText("2")).toBeTruthy();
        expect(within(stat("Active")).getByText("1")).toBeTruthy();
        expect(within(stat("Notifications sent")).getByText("3")).toBeTruthy();
    });

    it("opens the subscription editor", async () => {
        renderApp();
        fireEvent.click(await screen.findByRole("button", { name: "Add subscription" }));
        expect(await screen.findByRole("dialog", { name: "New subscription" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Create subscription" })).toBeTruthy();
    });
});
