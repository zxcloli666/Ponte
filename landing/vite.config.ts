import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appUrl = env.VITE_APP_URL || "https://app.ponte.work.gd";

  function pontePlugin(): Plugin {
    return {
      name: "ponte-landing",
      buildStart() {
        // Generate manifest.webmanifest with start_url pointing to the web app
        const manifest = {
          name: "Ponte",
          short_name: "Ponte",
          description: "Android → iOS bridge: SMS, calls, contacts & notifications",
          start_url: appUrl,
          scope: appUrl,
          display: "standalone",
          background_color: "#0a0a0f",
          theme_color: "#0a0a0f",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        };
        writeFileSync("public/manifest.webmanifest", JSON.stringify(manifest, null, 2));
      },
      transformIndexHtml(html) {
        return html.replace(/%VITE_APP_URL%/g, appUrl);
      },
    };
  }

  return {
    plugins: [react(), pontePlugin()],
    build: { outDir: "dist" },
  };
});
