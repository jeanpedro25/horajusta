import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;
const prerenderedPage = root.dataset.prerendered === "true";
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const prerenderedChunk = prerenderedPage
  ? pathname === '/termos'
    ? import('./pages/TermosUsoPage')
    : pathname === '/privacidade-publica'
      ? import('./pages/PrivacidadePublicaPage')
      : import('./pages/LandingPage')
  : Promise.resolve();

void prerenderedChunk.then(() => {
  createRoot(root).render(<App />);
});
