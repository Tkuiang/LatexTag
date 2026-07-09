import {defineConfig} from "vite";
import {resolve} from "node:path";

export default defineConfig(({mode}) => {
    const production = mode === "production";

    return {
        build: {
            emptyOutDir: production,
            minify: production,
            outDir: production ? "dist" : ".",
            sourcemap: !production,
            cssCodeSplit: false,
            lib: {
                entry: resolve(__dirname, "src/main.ts"),
                formats: ["cjs"],
                fileName: () => "index.js",
                cssFileName: "index",
            },
            rollupOptions: {
                external: ["siyuan"],
                output: {
                    exports: "default",
                    assetFileNames: (assetInfo) => {
                        return assetInfo.name === "style.css" ? "index.css" : "[name][extname]";
                    },
                },
            },
        },
    };
});
