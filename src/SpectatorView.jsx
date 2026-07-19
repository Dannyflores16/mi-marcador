// ─────────────────────────────────────────
// src/SpectatorView.jsx
// Vista del público — solo lectura
// URL: tu-app.com/espectador
// ─────────────────────────────────────────
import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, onValue, off } from "firebase/database";
import logoEquipo from "./assets/logo-equipo.png";
import logoUTN from "./assets/logo-utn.png";

function pad(n) { return String(n).padStart(2,"0"); }
function fmt(s) { return `${pad(Math.floor(s/60))}:${pad(s%60)}`; }
function isLight(hex="") {
  if (!hex||hex.length<7) return false;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000>128;
}
function fechaCorta(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
}

function Badge({ team, size=66 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${team.color}66`, background:`${team.color}22`, overflow:"hidden", flexShrink:0 }}>
      {team.logo
        ? <img src={team.logo} alt={team.name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
        : <span style={{ fontSize:size*.44 }}>{team.emoji||"⚽"}</span>}
    </div>
  );
}

export default function SpectatorView() {
  const [match,   setMatch]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash,   setFlash]   = useState(null); // "A" | "B" | null

  // ── Tabla de posiciones + historial de partidos ──
  const [standings,     setStandings]     = useState([]);
  const [partidosPrevios, setPartidosPrevios] = useState([]);
  const [hasHistory,    setHasHistory]    = useState(true);

  useEffect(() => {
    const r = ref(db,"partido");
    onValue(r, snap => {
      const data = snap.val();
      setLoading(false);
      if (!data) { setMatch(null); return; }
      setMatch(prev => {
        if (prev) {
          if (data.goalsA > prev.goalsA) { setFlash("A"); setTimeout(()=>setFlash(null),2000); }
          if (data.goalsB > prev.goalsB) { setFlash("B"); setTimeout(()=>setFlash(null),2000); }
        }
        return data;
      });
    });
    return () => off(r);
  }, []);

  // Historial → tabla de posiciones + lista de partidos jugados
  useEffect(() => {
    const historialRef = ref(db, "historial");
    const unsub = onValue(historialRef, (snap) => {
      const data = snap.val();
      if (!data) { setHasHistory(false); setStandings([]); setPartidosPrevios([]); return; }
      setHasHistory(true);

      const stats = {};
      const ensure = (name) => {
        const key = name.trim().toLowerCase();
        return (stats[key] ||= { name: name.trim(), pj:0, g:0, e:0, p:0, gf:0, gc:0 });
      };
      const lista = [];

      Object.entries(data).forEach(([id, m]) => {
        if (!m.teamA || !m.teamB) return;
        const golesA = Number(m.golesA || 0), golesB = Number(m.golesB || 0);
        const a = ensure(m.teamA), b = ensure(m.teamB);
        a.pj++; b.pj++;
        a.gf += golesA; a.gc += golesB;
        b.gf += golesB; b.gc += golesA;
        if (golesA > golesB) { a.g++; b.p++; }
        else if (golesA < golesB) { b.g++; a.p++; }
        else { a.e++; b.e++; }

        lista.push({ id, teamA:m.teamA, teamB:m.teamB, golesA, golesB, timestamp:m.timestamp||0 });
      });

      const table = Object.values(stats)
        .map(t => ({ ...t, dif: t.gf - t.gc, pts: t.g*3 + t.e }))
        .sort((x,y) => y.pts - x.pts || y.dif - x.dif || y.gf - x.gf);

      lista.sort((x,y) => y.timestamp - x.timestamp);

      setStandings(table);
      setPartidosPrevios(lista);
    });
    return () => unsub();
  }, []);

  // ── Cargando ─────────────────────────────
  if (loading) return (
    <div style={{ background:"#07111f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"Inter,sans-serif", color:"#fff" }}>
      <div style={{ fontSize:48 }}>⚽</div>
      <div style={{ fontSize:14, color:"#6b7280", fontWeight:600 }}>Conectando al marcador...</div>
    </div>
  );

  // ── Sin partido ───────────────────────────
  if (!match) return (
    <div style={{ background:"#07111f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"Inter,sans-serif", color:"#fff", padding:24, textAlign:"center" }}>
      <div style={{ fontSize:56 }}>🏟️</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#e5e7eb" }}>Aún no hay partido en vivo</div>
      <div style={{ fontSize:13, color:"#6b7280", maxWidth:260 }}>El marcador aparecerá aquí cuando el árbitro inicie el partido</div>
    </div>
  );

  const { teamA, teamB, goalsA, goalsB, secs, status, events } = match;
  const timerStr  = fmt(secs||0);
  const isLive    = status==="live";
  const isFinished= status==="finished";
  const period    = (secs/60)<45?"PRIMER TIEMPO":(secs/60)<90?"SEGUNDO TIEMPO":"PRÓRROGA";
  const flashTeam = flash==="A" ? teamA : teamB;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07111f}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        @keyframes lp{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes popIn{0%{transform:translate(-50%,-50%) scale(0)}60%{transform:translate(-50%,-50%) scale(1.1)}100%{transform:translate(-50%,-50%) scale(1)}}
        @keyframes bgFlash{0%{opacity:.3}100%{opacity:0}}

        .shell { max-width:430px; }
        .layout { display:flex; flex-direction:column; }
        .col-score, .col-events, .col-table { min-width:0; }

        @media (min-width: 960px) {
          .shell { max-width:1180px; }
          .layout {
            display:grid;
            grid-template-columns: 360px 1fr 360px;
            gap:16px;
            align-items:start;
          }
          .col-score, .col-events, .col-table { display:flex; flex-direction:column; }
        }
      `}</style>

      <div className="shell" style={{ fontFamily:"'Inter',sans-serif", background:"#07111f", minHeight:"100vh", margin:"0 auto", display:"flex", flexDirection:"column", color:"#fff" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 6px" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#6b7280" }}>
            {new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}
          </span>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:3 }}>MARCADOR EN VIVO</div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:isLive?"#22c55e":isFinished?"#ef4444":"#ca8a04", animation:isLive?"lp 1.4s infinite":"none" }} />
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, color:isLive?"#22c55e":isFinished?"#ef4444":"#ca8a04" }}>
              {isLive?"EN VIVO":isFinished?"FINALIZADO":"EN ESPERA"}
            </span>
          </div>
        </div>

        <div className="layout" style={{ flex:1, padding:"0 0 8px" }}>

          {/* ══ COLUMNA 1: MARCADOR ══ */}
          <div className="col-score">
            <div style={{ position:"relative", padding:"14px 16px 20px", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg,${teamA?.color||"#facc15"}18 0%,#0a3320 45%,${teamB?.color||"#dc2626"}18 100%)` }} />
              <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:"38%", border:"1.5px solid rgba(34,197,94,.09)", borderBottom:"none", borderRadius:"60% 60% 0 0/30% 30% 0 0" }} />

              {flash && (
                <>
                  <div style={{ position:"absolute", inset:0, background:`${flashTeam.color}30`, animation:"bgFlash 2s ease-out forwards", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", top:"50%", left:"50%", animation:"popIn .4s ease-out forwards", background:`${flashTeam.color}ee`, color:isLight(flashTeam.color)?"#000":"#fff", borderRadius:14, padding:"10px 24px", fontSize:16, fontWeight:900, zIndex:99, pointerEvents:"none", whiteSpace:"nowrap" }}>
                    ⚽ GOL {(flashTeam.name||"").toUpperCase()}!
                  </div>
                </>
              )}

              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamA?.name||"EQUIPO A").toUpperCase()}</div>
                    <Badge team={teamA||{emoji:"⚽",color:"#facc15",logo:""}} />
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:82, color:"#fff", textShadow:"0 2px 24px rgba(0,0,0,.8)", letterSpacing:-2 }}>{goalsA??0}</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:58, color:"rgba(255,255,255,.3)", margin:"0 4px" }}>-</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:82, color:"#fff", textShadow:"0 2px 24px rgba(0,0,0,.8)", letterSpacing:-2 }}>{goalsB??0}</span>
                    </div>
                    <div style={{ background:"rgba(0,0,0,.75)", border:"1px solid rgba(255,255,255,.15)", borderRadius:10, padding:"6px 20px", fontSize:22, fontWeight:800, letterSpacing:2, color:"#fff", marginTop:8, fontVariantNumeric:"tabular-nums" }}>{timerStr}</div>
                    {isLive    && <div style={{ fontSize:9, color:"#6b7280", fontWeight:800, letterSpacing:1.5, marginTop:5 }}>{period}</div>}
                    {isFinished && <div style={{ background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"4px 12px", fontSize:10, fontWeight:800, color:"#f87171", marginTop:6, letterSpacing:1 }}>PARTIDO FINALIZADO</div>}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamB?.name||"EQUIPO B").toUpperCase()}</div>
                    <Badge team={teamB||{emoji:"⚽",color:"#dc2626",logo:""}} />
                  </div>
                </div>
              </div>
            </div>

            {isFinished && (
              <div style={{ margin:"0 11px 8px", background:"rgba(30,64,175,.15)", border:"1px solid rgba(59,130,246,.25)", borderRadius:14, padding:"12px 16px", textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:900, color:"#e5e7eb" }}>
                  {goalsA>goalsB ? `🏆 GANÓ ${(teamA?.name||"Equipo A").toUpperCase()}`
                    : goalsB>goalsA ? `🏆 GANÓ ${(teamB?.name||"Equipo B").toUpperCase()}`
                    : "⚖️ PARTIDO EMPATADO"}
                </div>
                <div style={{ fontSize:11, color:"#6b7280", marginTop:3 }}>Resultado final</div>
              </div>
            )}
          </div>

          {/* ══ COLUMNA 2: EVENTOS + HISTORIAL DE PARTIDOS ══ */}
          <div className="col-events">
            <div style={{ margin:"7px 11px 20px", background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:13 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:"#6b7280", textAlign:"center", marginBottom:11 }}>EVENTOS DEL PARTIDO</div>
              {(!events||events.length===0)
                ? <div style={{ fontSize:12, color:"#4b5563", textAlign:"center", padding:14 }}>Aún no hay goles</div>
                : [...events].reverse().map((ev,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.04)", marginBottom:i<events.length-1?7:0 }}>
                    <span style={{ fontSize:16 }}>⚽</span>
                    <span style={{ fontSize:11, color:"#6b7280", fontWeight:700, minWidth:28 }}>{ev.min}'</span>
                    <span style={{ flex:1, color:"#e5e7eb", fontWeight:600, fontSize:13 }}>{ev.player}</span>
                    <span style={{ padding:"3px 9px", borderRadius:7, fontSize:10, fontWeight:800, background:ev.color||"#374151", color:isLight(ev.color||"#374151")?"#000":"#fff" }}>{ev.tag}</span>
                  </div>
                ))}
            </div>

            {/* Historial de partidos jugados */}
            <div style={{ margin:"7px 11px 20px", background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:13 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:"#6b7280", textAlign:"center", marginBottom:11 }}>PARTIDOS ANTERIORES</div>
              {partidosPrevios.length === 0
                ? <div style={{ fontSize:12, color:"#4b5563", textAlign:"center", padding:14 }}>Aún no hay partidos terminados</div>
                : partidosPrevios.map((p,i) => (
                  <div key={p.id} style={{ padding:"9px 10px", borderRadius:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.04)", marginBottom:i<partidosPrevios.length-1?7:0 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"#e5e7eb", textAlign:"right" }}>{p.teamA}</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:"#facc15", padding:"0 4px" }}>{p.golesA}-{p.golesB}</div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"#e5e7eb", textAlign:"left" }}>{p.teamB}</div>
                    </div>
                    {p.timestamp > 0 && (
                      <div style={{ fontSize:9.5, color:"#4b5563", textAlign:"center", marginTop:4 }}>{fechaCorta(p.timestamp)}</div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* ══ COLUMNA 3: TABLA DE POSICIONES ══ */}
          <div className="col-table">
            <div style={{ margin:"7px 11px 20px", background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:13 }}>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:12 }}>
                <img src={logoEquipo} alt="Logo del equipo" style={{ height:32, width:32, objectFit:"contain", borderRadius:6 }} />
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:"#6b7280", textAlign:"center", flex:1 }}>TABLA DE POSICIONES</div>
                <img src={logoUTN} alt="Logo UTN" style={{ height:32, width:32, objectFit:"contain", borderRadius:6 }} />
              </div>

              {!hasHistory ? (
                <div style={{ fontSize:12, color:"#4b5563", textAlign:"center", padding:14 }}>Aún no hay partidos terminados</div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                      {["#","Equipo","PJ","G","E","P","GF","GC","DIF","PTS"].map((h,i) => (
                        <th key={h} style={{
                          padding:"8px 4px", fontSize:9, fontWeight:800, letterSpacing:.5,
                          color:"#6b7280", textAlign: i===1 ? "left" : "center",
                          paddingLeft: i===1 ? 8 : 4,
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
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{i+1}</td>
                        <td style={{ padding:"8px 4px 8px 8px", fontSize:11.5, fontWeight:700 }}>{t.name}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.pj}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.g}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.e}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.p}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.gf}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.gc}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11 }}>{t.dif>0?"+"+t.dif:t.dif}</td>
                        <td style={{ padding:"8px 4px", textAlign:"center", fontSize:11.5, fontWeight:800, color:"#facc15" }}>{t.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ background:"rgba(7,17,31,.97)", borderTop:"1px solid rgba(255,255,255,.07)", padding:"10px 16px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#374151", fontWeight:600, letterSpacing:1 }}>👁 VISTA ESPECTADOR · Solo lectura</div>
        </div>

      </div>
    </>
  );
}