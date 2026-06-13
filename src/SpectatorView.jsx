// ─────────────────────────────────────────
// src/SpectatorView.jsx
// Vista del público — solo lectura
// URL: tu-app.com/espectador
// ─────────────────────────────────────────
import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, onValue, off } from "firebase/database";

function pad(n) { return String(n).padStart(2,"0"); }
function fmt(s) { return `${pad(Math.floor(s/60))}:${pad(s%60)}`; }
function isLight(hex="") {
  if (!hex||hex.length<7) return false;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000>128;
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
      `}</style>

      <div style={{ fontFamily:"'Inter',sans-serif", background:"#07111f", minHeight:"100vh", maxWidth:430, margin:"0 auto", display:"flex", flexDirection:"column", color:"#fff" }}>

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

        <div style={{ flex:1, overflowY:"auto" }}>

          {/* Hero */}
          <div style={{ position:"relative", padding:"14px 16px 20px", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg,${teamA?.color||"#facc15"}18 0%,#0a3320 45%,${teamB?.color||"#dc2626"}18 100%)` }} />
            <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:"38%", border:"1.5px solid rgba(34,197,94,.09)", borderBottom:"none", borderRadius:"60% 60% 0 0/30% 30% 0 0" }} />

            {/* Flash de gol */}
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

                {/* Equipo A */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamA?.name||"EQUIPO A").toUpperCase()}</div>
                  <Badge team={teamA||{emoji:"⚽",color:"#facc15",logo:""}} />
                </div>

                {/* Marcador */}
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

                {/* Equipo B */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamB?.name||"EQUIPO B").toUpperCase()}</div>
                  <Badge team={teamB||{emoji:"⚽",color:"#dc2626",logo:""}} />
                </div>

              </div>
            </div>
          </div>

          {/* Resultado final */}
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

          {/* Eventos */}
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

        </div>

        {/* Footer */}
        <div style={{ background:"rgba(7,17,31,.97)", borderTop:"1px solid rgba(255,255,255,.07)", padding:"10px 16px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#374151", fontWeight:600, letterSpacing:1 }}>👁 VISTA ESPECTADOR · Solo lectura</div>
        </div>

      </div>
    </>
  );
}