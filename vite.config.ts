import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      name: "InstagramRelationshipIntelligenceDashboard",
      formats: ["iife"],
      fileName: () => "igrid.injected.js"
    }
  }
});
