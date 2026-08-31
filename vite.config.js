import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // If you deploy this as a sub-path on GitHub Pages
  // (e.g. username.github.io/repo-name), uncomment and set base:
  // base: "/repo-name/",
});
