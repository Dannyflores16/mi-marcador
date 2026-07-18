// ─────────────────────────────────────────
// src/AdminView.jsx
// Vista del árbitro — escribe en Firebase
// URL: tu-app.com/admin
// ─────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, push, remove } from "firebase/database";

// ── Helpers ──────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function fmt(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function isLight(hex = "#000") {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114)/1000 > 128;
}
async function toDataUrl(file) {
  return new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
}

const COLORS = ["#facc15","#ef4444","#3b82f6","#22c55e","#a855f7","#f97316","#06b6d4","#ffffff"];

const INIT = {
  teamA:   { name:"Equipo A", emoji:"⚽", logo:"", color:"#facc15" },
  teamB:   { name:"Equipo B", emoji:"⚽", logo:"", color:"#dc2626" },
  goalsA:  0, goalsB: 0, secs: 0,
  running: false, status:"waiting", events:[],
};

// ── Badge del equipo ─────────────────────
function Badge({ team, size=58 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${team.color}66`, background:`${team.color}22`, overflow:"hidden", flexShrink:0 }}>
      {team.logo
        ? <img src={team.logo} alt={team.name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
        : <span style={{ fontSize:size*.44 }}>{team.emoji||"⚽"}</span>}
    </div>
  );
}

// ── Input reutilizable ───────────────────
function Field({ label, ...p }) {
  return (
    <div style={{ marginBottom:10 }}>
      {label && <div style={{ fontSize:10, fontWeight:800, color:"#9ca3af", marginBottom:5, letterSpacing:".5px" }}>{label}</div>}
      <input style={{ width:"100%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:13, fontWeight:600, outline:"none", fontFamily:"Inter,sans-serif" }} {...p} />
    </div>
  );
}

// ── ADMIN VIEW ───────────────────────────
export default function AdminView() {
  const [match,  setMatch]  = useState(INIT);
  const [screen, setScreen] = useState("marcador"); // marcador | config
  const [tab,    setTab]    = useState("a");         // a | b (equipo en config)
  const [toast,  setToast]  = useState("");
  const ticker = useRef(null);
  const toastT = useRef(null);

  // Guarda en Firebase
  function pushMatch(data) { set(ref(db, "partido"), data); }

  // Guarda el resultado final en el historial (para la tabla de posiciones)
  function guardarEnHistorial() {
    const historialRef = ref(db, "historial");
    const nuevoRegistro = push(historialRef);
    set(nuevoRegistro, {
      teamA: match.teamA.name || "Equipo A",
      teamB: match.teamB.name || "Equipo B",
      golesA: match.goalsA,
      golesB: match.goalsB,
      timestamp: Date.now(),
    });
  }

  // Borra todo el historial de partidos (reinicia la tabla de posiciones)
  function borrarHistorial() {
    const confirmar = window.confirm("¿Seguro que quieres borrar TODO el historial de partidos? Esto no se puede deshacer.");
    if (!confirmar) return;
    remove(ref(db, "historial"));
    toast_("🗑️ Historial borrado");
  }

  // Cronómetro
  useEffect(() => {
    if (match.running) {
      ticker.current = setInterval(() => {
        setMatch(prev => { const n = {...prev, secs: prev.secs+1}; pushMatch(n); return n; });
      }, 1000);
    } else { clearInterval(ticker.current); }
    return () => clearInterval(ticker.current);
  }, [match.running]);

  function update(changes) {
    setMatch(prev => { const n = {...prev, ...changes}; pushMatch(n); return n; });
  }

  function toast_(msg) {
    clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(""), 2200);
  }

  function addGoal(team) {
    const min  = Math.floor(match.secs/60);
    const t    = team==="A" ? match.teamA : match.teamB;
    const name = t.name || "Equipo "+team;
    const ev   = { min, player:`Gol ${name}`, color:t.color, tag:name.slice(0,3).toUpperCase() };
    update({
      goalsA: team==="A" ? match.goalsA+1 : match.goalsA,
      goalsB: team==="B" ? match.goalsB+1 : match.goalsB,
      events: [...(match.events||[]), ev],
      status: "live",
    });
    toast_(`⚽ GOL ${name.toUpperCase()}!`);
  }

  function subGoal(team) {
    update({
      goalsA: team==="A" ? Math.max(0,match.goalsA-1) : match.goalsA,
      goalsB: team==="B" ? Math.max(0,match.goalsB-1) : match.goalsB,
    });
  }

  async function handleLogo(team, file) {
    if (!file) return;
    const url = await toDataUrl(file);
    if (team==="A") update({ teamA:{...match.teamA, logo:url} });
    else            update({ teamB:{...match.teamB, logo:url} });
  }

  const { teamA, teamB, goalsA, goalsB } = match;
  const timerStr = fmt(match.secs);
  const lblA = (teamA.name||"Equipo A").slice(0,7).toUpperCase();
  const lblB = (teamB.name||"Equipo B").slice(0,7).toUpperCase();
  const period = Math.floor(match.secs/60)<45 ? "PRIMER TIEMPO" : Math.floor(match.secs/60)<90 ? "SEGUNDO TIEMPO" : "PRÓRROGA";

  const S = { // estilos comunes
    panel: { margin:"7px 11px", background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:13 },
    card:  { marginBottom:10, background:"rgba(15,23,42,.96)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:14 },
    ptitle:{ fontSize:10, fontWeight:800, letterSpacing:2, color:"#6b7280", textAlign:"center", marginBottom:11 },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07111f}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        @keyframes lp{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      <div style={{ fontFamily:"'Inter',sans-serif", background:"#07111f", minHeight:"100vh", maxWidth:430, margin:"0 auto", display:"flex", flexDirection:"column", color:"#fff" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#16a34a", color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:800, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,.4)" }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 4px" }}>
          <div style={{ background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:800, color:"#f87171", letterSpacing:1 }}>🔒 ADMIN</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:3 }}>PANEL DE CONTROL</div>
          <button onClick={() => setScreen(screen==="config"?"marcador":"config")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#9ca3af" }}>
            {screen==="config" ? "✕" : "⚙️"}
          </button>
        </div>

        {/* Status */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"2px 0 8px" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background: match.status==="live"?"#22c55e": match.status==="finished"?"#ef4444":"#ca8a04", animation: match.status==="live"?"lp 1.4s infinite":"none" }} />
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, color: match.status==="live"?"#22c55e": match.status==="finished"?"#ef4444":"#ca8a04" }}>
            {match.status==="live"?"EN VIVO": match.status==="finished"?"FINALIZADO":"EN ESPERA"}
          </span>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>

          {/* ══ PANTALLA: MARCADOR ══ */}
          {screen==="marcador" && (<>

            {/* Hero */}
            <div style={{ position:"relative", padding:"10px 14px 16px", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${teamA.color}22 0%,#0a3320 40%,${teamB.color}22 100%)` }} />
              <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:"38%", border:"1.5px solid rgba(34,197,94,.09)", borderBottom:"none", borderRadius:"60% 60% 0 0/30% 30% 0 0" }} />
              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:6 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                    <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamA.name||"EQUIPO A").toUpperCase()}</div>
                    <Badge team={teamA} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:76, color:"#fff", textShadow:"0 2px 20px rgba(0,0,0,.7)", letterSpacing:-2 }}>{goalsA}</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:55, color:"rgba(255,255,255,.3)", margin:"0 3px" }}>-</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:76, color:"#fff", textShadow:"0 2px 20px rgba(0,0,0,.7)", letterSpacing:-2 }}>{goalsB}</span>
                    </div>
                    <div style={{ background:"rgba(0,0,0,.72)", border:"1px solid rgba(255,255,255,.14)", borderRadius:10, padding:"5px 18px", fontSize:20, fontWeight:800, letterSpacing:2, color:"#fff", marginTop:7, fontVariantNumeric:"tabular-nums" }}>{timerStr}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                    <div style={{ fontSize:12, fontWeight:900, letterSpacing:2, color:"#e5e7eb", textAlign:"center" }}>{(teamB.name||"EQUIPO B").toUpperCase()}</div>
                    <Badge team={teamB} />
                  </div>
                </div>
              </div>
            </div>

            {/* Controles */}
            <div style={S.panel}>
              <div style={S.ptitle}>CONTROLES DEL PARTIDO</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:7, marginBottom:9 }}>
                {[
                  { l:"+1 GOL", s:lblA, bg:teamA.color, fn:()=>addGoal("A") },
                  { l:"−1 GOL", s:lblA, bg:"#dc2626",   fn:()=>subGoal("A") },
                  { l:"+1 GOL", s:lblB, bg:teamB.color, fn:()=>addGoal("B") },
                  { l:"−1 GOL", s:lblB, bg:"#7f1d1d",   fn:()=>subGoal("B") },
                ].map((b,i) => (
                  <button key={i} onClick={b.fn} style={{ border:"none", borderRadius:11, padding:"11px 2px 9px", fontSize:14, fontWeight:900, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:b.bg, color:isLight(b.bg)?"#000":"#fff", lineHeight:1 }}>
                    {b.l}<span style={{ fontSize:9, fontWeight:700, opacity:.85 }}>{b.s}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
                <button onClick={() => update({ running:!match.running, status:"live" })} style={{ border:"none", borderRadius:11, padding:"12px 6px", fontSize:12, fontWeight:800, cursor:"pointer", background:match.running?"#ea580c":"#1d4ed8", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  {match.running ? "⏸ PAUSAR" : "▶ INICIAR"}
                </button>
                <button onClick={() => update({ running:false })} disabled={!match.running} style={{ border:"none", borderRadius:11, padding:"12px 6px", fontSize:12, fontWeight:800, cursor:match.running?"pointer":"not-allowed", background:match.running?"#ea580c":"rgba(234,88,12,.2)", color:match.running?"#fff":"#7c2d12", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  ⏸ PAUSAR
                </button>
                <button onClick={() => { clearInterval(ticker.current); update({ running:false, secs:0, goalsA:0, goalsB:0, events:[], status:"waiting" }); toast_("🔄 Listo para nuevo partido"); }} style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:11, padding:"12px 6px", fontSize:12, fontWeight:800, cursor:"pointer", background:"rgba(55,65,81,.7)", color:"#d1d5db", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  ↺ REINICIAR
                </button>
              </div>
              <button onClick={() => {
                clearInterval(ticker.current);
                guardarEnHistorial();
                update({ running:false, status:"finished" });
                toast_("⏹ Partido finalizado");
              }} style={{ width:"100%", marginTop:9, border:"1.5px solid rgba(239,68,68,.35)", borderRadius:11, padding:11, background:"rgba(127,29,29,.35)", color:"#fca5a5", fontSize:12, fontWeight:800, cursor:"pointer", letterSpacing:1 }}>
                ⏹ FINALIZAR PARTIDO
              </button>
              <button onClick={borrarHistorial} style={{ width:"100%", marginTop:9, border:"1px solid rgba(255,255,255,.08)", borderRadius:11, padding:9, background:"rgba(55,65,81,.4)", color:"#9ca3af", fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:.5 }}>
                🗑️ Borrar historial (tabla de posiciones)
              </button>
            </div>

            {/* Eventos */}
            <div style={S.panel}>
              <div style={S.ptitle}>EVENTOS DEL PARTIDO</div>
              <div style={{ display:"flex", gap:9 }}>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                  {(!match.events||match.events.length===0)
                    ? <div style={{ fontSize:12, color:"#4b5563", textAlign:"center", padding:8 }}>Los goles aparecerán aquí</div>
                    : [...match.events].reverse().slice(0,5).map((ev,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 8px", borderRadius:9, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.04)" }}>
                        <span>⚽</span>
                        <span style={{ fontSize:11, color:"#6b7280", fontWeight:700, minWidth:26 }}>{ev.min}'</span>
                        <span style={{ flex:1, color:"#e5e7eb", fontWeight:500, fontSize:13 }}>{ev.player}</span>
                        <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:800, background:ev.color, color:isLight(ev.color)?"#000":"#fff" }}>{ev.tag}</span>
                      </div>
                    ))}
                </div>
                <div style={{ background:"rgba(0,0,0,.55)", border:"1px solid rgba(255,255,255,.07)", borderRadius:13, padding:"10px 12px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minWidth:100, gap:3 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#22c55e", letterSpacing:1, fontVariantNumeric:"tabular-nums", textShadow:"0 0 18px rgba(34,197,94,.35)" }}>{timerStr}</div>
                  <div style={{ fontSize:8, color:"#374151", letterSpacing:1, fontWeight:800, textAlign:"center" }}>{period}</div>
                </div>
              </div>
            </div>

            {/* Link espectador */}
            <div style={{ margin:"7px 11px 20px", background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.2)", borderRadius:14, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#22c55e", marginBottom:6, letterSpacing:1 }}>📤 LINK PARA ESPECTADORES</div>
              <div style={{ background:"rgba(0,0,0,.4)", borderRadius:8, padding:"9px 12px", fontSize:11, color:"#9ca3af", fontFamily:"monospace", marginBottom:8, wordBreak:"break-all" }}>
                {window.location.origin}/espectador
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/espectador`); toast_("✅ Link copiado — ¡compártelo!"); }} style={{ width:"100%", border:"1px solid rgba(34,197,94,.3)", borderRadius:9, padding:9, background:"rgba(34,197,94,.12)", color:"#22c55e", fontSize:12, fontWeight:800, cursor:"pointer" }}>
                📋 Copiar link
              </button>
            </div>

          </>)}

          {/* ══ PANTALLA: CONFIG ══ */}
          {screen==="config" && (
            <div style={{ padding:"6px 11px 24px" }}>

              {/* Tabs A / B */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {["a","b"].map(t => (
                  <button key={t} onClick={()=>setTab(t)} style={{ border:"none", borderRadius:10, padding:"9px 0", fontSize:12, fontWeight:800, cursor:"pointer", background:tab===t?"#1d4ed8":"rgba(255,255,255,.06)", color:tab===t?"#fff":"#6b7280" }}>
                    {t==="a"?"🏠 Equipo Local":"✈️ Equipo Visitante"}
                  </button>
                ))}
              </div>

              {["a","b"].map(t => {
                const team = t==="a" ? teamA : teamB;
                const key  = t==="a" ? "teamA" : "teamB";
                if (tab!==t) return null;
                return (
                  <div key={t}>
                    <div style={S.card}>
                      {/* Logo uploader */}
                      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                        <label style={{ width:66, height:66, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`2px ${team.logo?"solid":"dashed"} ${team.color}88`, background:`${team.color}22`, overflow:"hidden", flexShrink:0, cursor:"pointer" }}>
                          {team.logo
                            ? <img src={team.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                            : <span style={{ fontSize:28 }}>{team.emoji||"⚽"}</span>}
                          <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleLogo(t==="a"?"A":"B", e.target.files[0])} />
                        </label>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800, color:"#e5e7eb", marginBottom:6 }}>{team.name||"Equipo"}</div>
                          <label style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(59,130,246,.15)", border:"1px solid rgba(59,130,246,.3)", borderRadius:8, padding:"6px 11px", fontSize:11, fontWeight:800, color:"#60a5fa", cursor:"pointer" }}>
                            📁 Subir logo PNG / JPG
                            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleLogo(t==="a"?"A":"B", e.target.files[0])} />
                          </label>
                          {team.logo && (
                            <button onClick={()=>update({ [key]:{...team, logo:""} })} style={{ marginLeft:6, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:800, color:"#f87171", cursor:"pointer" }}>✕ Quitar</button>
                          )}
                        </div>
                      </div>

                      <Field label="NOMBRE DEL EQUIPO" value={team.name} placeholder="Ej: América, Barcelona..." onChange={e=>update({ [key]:{...team, name:e.target.value} })} />
                      <Field label="EMOJI (si no subes imagen)" value={team.emoji} onChange={e=>update({ [key]:{...team, emoji:e.target.value} })} style={{ fontSize:20 }} />

                      <div>
                        <div style={{ fontSize:10, fontWeight:800, color:"#9ca3af", marginBottom:8 }}>COLOR DEL EQUIPO</div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <input type="color" value={team.color} onChange={e=>update({ [key]:{...team, color:e.target.value} })} style={{ width:40, height:40, border:"none", borderRadius:8, cursor:"pointer", background:"none" }} />
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {COLORS.map(c => (
                              <div key={c} onClick={()=>update({ [key]:{...team, color:c} })} style={{ width:26, height:26, borderRadius:6, background:c, cursor:"pointer", border:team.color===c?"2px solid #fff":"2px solid transparent" }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button onClick={()=>{ toast_("✅ Guardado"); setScreen("marcador"); }} style={{ width:"100%", border:"none", borderRadius:12, padding:14, background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", fontSize:14, fontWeight:900, cursor:"pointer", letterSpacing:1 }}>
                      💾 GUARDAR Y APLICAR
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}