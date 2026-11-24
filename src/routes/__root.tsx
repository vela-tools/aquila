import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
    component: Outlet,
    notFoundComponent: () => (
        <div style={{ padding: 24, color: "var(--vela-color-text2)", fontSize: 13 }}>Route not found.</div>
    ),
});
