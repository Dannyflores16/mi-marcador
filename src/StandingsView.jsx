// ─────────────────────────────────────────
// src/StandingsView.jsx
// Tabla de posiciones — lee /historial en Firebase
// URL: tu-app.com/tabla
// ─────────────────────────────────────────
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";

export default function StandingsView() {
  const [partido, setPartido] = useState(null);
  const [standings, setStandings] = useState([]);
  const [hasHistory, setHasHistory] = useState(true);

  // Marcador en vivo
  useEffect(() => {
    const partidoRef = ref(db, "partido");
    const unsub = onValue(partidoRef, (snap) => setPartido(snap.val()));
    return () => unsub();
  }, []);

  // Historial → tabla calculada
  useEffect(() => {
    const historialRef = ref(db, "historial");
    const unsub = onValue(historialRef, (snap) => {
      const data = snap.val();
      if (!data) { setHasHistory(false); setStandings([]); return; }
      setHasHistory(true);

      const stats = {};
      const ensure = (name) => (stats[name] ||= { name, pj:0, g:0, e:0, p:0, gf:0, gc:0 });

      Object.values(data).forEach((m) => {
        if (!m.teamA || !m.teamB) return;
        const a = ensure(m.teamA), b = ensure(m.teamB);
        const golesA = Number(m.golesA || 0), golesB = Number(m.golesB || 0);
        a.pj++; b.pj++;
        a.gf += golesA; a.gc += golesB;
        b.gf += golesB; b.gc += golesA;
        if (golesA > golesB) { a.g++; b.p++; }
        else if (golesA < golesB) { b.g++; a.p++; }
        else { a.e++; b.e++; }
      });

      const table = Object.values(stats)
        .map(t => ({ ...t, dif: t.gf - t.gc, pts: t.g*3 + t.e }))
        .sort((x,y) => y.pts - x.pts || y.dif - x.dif || y.gf - x.gf);

      setStandings(table);
    });
    return () => unsub();
  }, []);

  const running = partido?.running;
  const statusColor = running ? "#22c55e" : partido?.status === "finished" ? "#ef4444" : "#ca8a04";
  const statusText = running ? "EN VIVO" : partido?.status === "finished" ? "FINALIZADO" : "EN ESPERA";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07111f}
        @keyframes lp{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      <div style={{ fontFamily:"'Inter',sans-serif", background:"#07111f", minHeight:"100vh", maxWidth:640, margin:"0 auto", padding:"20px 14px 40px", color:"#fff" }}>

        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, textAlign:"center", marginBottom:18 }}>
          TABLA DE POSICIONES
        </div>

        {/* Marcador en vivo */}
        {partido && (
          <div style={{ background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:16, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:12 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:statusColor, animation: running ? "lp 1.4s infinite" : "none" }} />
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, color:statusColor }}>{statusText}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:6 }}>
              <div style={{ fontSize:13, fontWeight:800, textAlign:"center", color:"#e5e7eb" }}>{(partido.teamA?.name || "Equipo A").toUpperCase()}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, textAlign:"center" }}>{partido.goalsA ?? 0} – {partido.goalsB ?? 0}</div>
              <div style={{ fontSize:13, fontWeight:800, textAlign:"center", color:"#e5e7eb" }}>{(partido.teamB?.name || "Equipo B").toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div style={{ background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, overflow:"hidden" }}>
          {!hasHistory ? (
            <div style={{ padding:"30px 16px", textAlign:"center", color:"#6b7280", fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>
              Aún no hay partidos terminados.<br/>En cuanto finalices uno en /admin, aparece aquí.
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  {["#","Equipo","PJ","G","E","P","GF","GC","DIF","PTS"].map((h,i) => (
                    <th key={h} style={{
                      padding:"10px 6px", fontSize:10, fontWeight:800, letterSpacing:1,
                      color:"#6b7280", textAlign: i===1 ? "left" : "center",
                      paddingLeft: i===1 ? 14 : 6,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((t,i) => (
                  <tr key={t.name} style={{
                    borderBottom:"1px solid rgba(255,255,255,.05)",
                    boxShadow: i===0 ? "inset 3px 0 0 #facc15" : "none",
                  }}>
                    <td style={{ padding:"10px 6px", textAlign:"center", fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</td>
                    <td style={{ padding:"10px 6px 10px 14px", fontSize:13, fontWeight:700 }}>{t.name}</td>
                    <td style={cellStyle}>{t.pj}</td>
                    <td style={cellStyle}>{t.g}</td>
                    <td style={cellStyle}>{t.e}</td>
                    <td style={cellStyle}>{t.p}</td>
                    <td style={cellStyle}>{t.gf}</td>
                    <td style={cellStyle}>{t.gc}</td>
                    <td style={cellStyle}>{t.dif > 0 ? "+"+t.dif : t.dif}</td>
                    <td style={{ ...cellStyle, fontWeight:800, color:"#facc15" }}>{t.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

const cellStyle = { padding:"10px 6px", textAlign:"center", fontSize:12, fontFamily:"'JetBrains Mono',monospace" };