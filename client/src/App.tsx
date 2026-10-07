import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./routes/HomePage";
import { RoomPage } from "./routes/RoomPage";
import { WordPackBuilderPage } from "./routes/WordPackBuilderPage";
import { AppHeader } from "./components/shared/AppHeader";
import { DoodleBackground } from "./components/shared/DoodleBackground";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { ReconnectToasts } from "./components/shared/ReconnectToasts";
import { useAudioStore } from "./store/useAudioStore";

export function App() {
  useSocket();

  // Browsers block audio until a user gesture — grab the very first
  // click/tap/keypress anywhere to unlock the Web Audio context so the first
  // sound effect doesn't get silently dropped.
  useEffect(() => {
    const unlock = () => useAudioStore.getState().unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // The on-screen keyboard shrinks only the *visual* viewport on iOS (Android
  // honors interactive-widget=resizes-content in index.html instead), so the
  // page used to scroll the canvas out of view while typing a guess. Sizing
  // the shell to the visual viewport keeps canvas + chat input both visible.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      if (Math.abs(viewport.scale - 1) > 0.01) return; // pinch-zoomed, leave it
      document.documentElement.style.setProperty("--app-height", `${viewport.height}px`);
      window.scrollTo(0, 0);
    };
    sync();
    viewport.addEventListener("resize", sync);
    return () => viewport.removeEventListener("resize", sync);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Padding reserves the fixed AppHeader's height (plus the notch /
            home-indicator safe areas) so no route renders underneath it. */}
        <div className="app-shell relative w-full">
          <DoodleBackground />
          <AppHeader />
          <ReconnectToasts />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:code" element={<RoomPage />} />
            <Route path="/wordpacks" element={<WordPackBuilderPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
