import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import browserslistToEsbuild from "browserslist-to-esbuild";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
            routeFileIgnorePattern: "\\.(js|jsx)$",
        }),
        react(),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
        dedupe: ["react", "react-dom", "react/jsx-runtime", "@mantine/core", "@mantine/hooks", "@tanstack/react-query"],
    },
    build: {
        target: browserslistToEsbuild(),
        // The licences of the bundled packages. The image adds LICENSE.md and NOTICE.md beside them,
        // and serves all three at /licenses/.
        license: { fileName: "licenses/third-party.md" },
    },
    server: {
        port: 2361,
        open: true,
    },
    preview: {
        port: 2361,
        strictPort: true,
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["./test/setup.ts"],
        css: false,
    },
});
