import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.css";
import "@vela-tools/ui/styles.css";
import "@vela-tools/ui/fonts";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AquilaProviders } from "./AquilaProviders";
import { loadConfig } from "./config";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultStaleTime: 5000,
    scrollRestoration: true,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const config = await loadConfig();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AquilaProviders config={config}>
            <RouterProvider router={router} />
        </AquilaProviders>
    </StrictMode>,
);
