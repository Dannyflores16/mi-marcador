// ─────────────────────────────────────────
// src/App.js
// ─────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminView     from "./AdminView";
import SpectatorView from "./SpectatorView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin"      element={<AdminView />} />
        <Route path="/espectador" element={<SpectatorView />} />
        <Route path="*"           element={<Navigate to="/espectador" replace />} />
      </Routes>
    </BrowserRouter>
  );
}