// ─────────────────────────────────────────
// src/App.js
// ─────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminView     from "./AdminView";
import SpectatorView from "./SpectatorView";
import StandingsView from "./StandingsView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin"      element={<AdminView />} />
        <Route path="/espectador" element={<SpectatorView />} />
        <Route path="*"           element={<Navigate to="/espectador" replace />} />
        <Route path="/tabla" element={<StandingsView/>} />
      </Routes>
    </BrowserRouter>
  );
}