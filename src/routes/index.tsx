import { createFileRoute } from "@tanstack/react-router";
import { AppShellAquila } from "../components/AppShellAquila";

export const Route = createFileRoute("/")({
    component: AppShellAquila,
});
