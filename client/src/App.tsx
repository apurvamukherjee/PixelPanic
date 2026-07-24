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

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="relative h-dvh w-full">
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
