import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./routes/HomePage";
import { RoomPage } from "./routes/RoomPage";
import { WordPackBuilderPage } from "./routes/WordPackBuilderPage";

export function App() {
  useSocket();

  return (
    <BrowserRouter>
      <div className="h-dvh w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/wordpacks" element={<WordPackBuilderPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
