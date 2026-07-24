import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./routes/HomePage";
import { RoomPage } from "./routes/RoomPage";
import { WordPackBuilderPage } from "./routes/WordPackBuilderPage";
import { AppHeader } from "./components/shared/AppHeader";
import { DoodleBackground } from "./components/shared/DoodleBackground";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { ReconnectToasts } from "./components/shared/ReconnectToasts";

export function App() {
  useSocket();

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
