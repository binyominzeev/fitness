import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";
import { initAuth } from "./lib/auth";

registerSW({ immediate: true });

// A BrowserRouter előtt kell lefutnia, hogy az OIDC callback URL-je még a renderelés előtt megtisztuljon.
void initAuth().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
