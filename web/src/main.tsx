import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

// Styles (order matters: tokens first, then global reset, then modules)
import "@/shared/styles/tokens.css";
import "@/shared/styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
