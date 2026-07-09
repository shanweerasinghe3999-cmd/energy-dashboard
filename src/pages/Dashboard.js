import { useEffect, useState } from "react";
import { db, auth, firestore } from "../firebase/firebase";
import { ref, onValue, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

// ─── NAV ITEMS ───────────────────────────────────────────────
const NAV = [
  { id:"home",      icon:"🏠", label:"Home" },
  { id:"analytics", icon:"📊", label:"Analytics" },
  { id:"ai",        icon:"🤖", label:"AI Analysis" },
  { id:"devices",   icon:"💡", label:"Devices" },
  { id:"billing",   icon:"💰", label:"Billing" },
  { id:"settings",  icon:"⚙️", label:"Settings" },
  { id:"about",     icon:"ℹ️", label:"About" },
];

// ─── THEME COLORS ─────────────────────────────────────────────
function getColors(dark) {
  return dark ? {
    bg:      "#0a0f1e",
    bgGrad:  "radial-gradient(ellipse at 20% 10%,rgba(0,200,150,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(0,120,255,0.07) 0%,transparent 50%)",
    sidebar: "#0d1526",
    sideB:   "rgba(255,255,255,0.06)",
    card:    "rgba(255,255,255,0.06)",
    cardBo:  "rgba(255,255,255,0.14)",
    panel:   "rgba(255,255,255,0.04)",
    panelBo: "rgba(255,255,255,0.10)",
    text:    "#f1f5f9",
    sub:     "#cbd5e1",
    muted:   "#94a3b8",
    border:  "rgba(255,255,255,0.07)",
    statBo:  "rgba(255,255,255,0.07)",
    input:   "rgba(255,255,255,0.05)",
    inputBo: "rgba(255,255,255,0.12)",
    tooltip: "#0f1a2e",
    relayBg: "rgba(255,255,255,0.05)",
    relayBo: "rgba(255,255,255,0.12)",
    relayTx: "#cbd5e1",
  } : {
    bg:      "#f0f4f8",
    bgGrad:  "none",
    sidebar: "#ffffff",
    sideB:   "#e5e7eb",
    card:    "#ffffff",
    cardBo:  "#d1d5db",
    panel:   "#ffffff",
    panelBo: "#d1d5db",
    text:    "#111827",
    sub:     "#374151",
    muted:   "#6b7280",
    border:  "#e5e7eb",
    statBo:  "#e5e7eb",
    input:   "#f9fafb",
    inputBo: "#d1d5db",
    tooltip: "#ffffff",
    relayBg: "#f9fafb",
    relayBo: "#d1d5db",
    relayTx: "#374151",
  };
}

const CARD_COLORS = {
  voltage:  { val:"#60efff", top:"linear-gradient(90deg,#0070f3,#60efff)" },
  current:  { val:"#fbbf24", top:"linear-gradient(90deg,#f97316,#fbbf24)" },
  power:    { val:"#fb7185", top:"linear-gradient(90deg,#e11d48,#fb7185)" },
  energy:   { val:"#a78bfa", top:"linear-gradient(90deg,#7c3aed,#a78bfa)" },
  temp:     { val:"#f97316", top:"linear-gradient(90deg,#ea580c,#f97316)" },
  humidity: { val:"#38bdf8", top:"linear-gradient(90deg,#0284c7,#38bdf8)" },
};

// ─── SHARED STYLES ────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; }
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
  .live-dot{animation:pulse 1.5s infinite;}
  .nav-item{display:flex;align-items:center;gap:14px;padding:14px 20px;border-radius:12px;cursor:pointer;transition:all 0.2s;font-size:18px;font-weight:600;margin-bottom:4px;}
  .nav-item:hover{background:rgba(0,200,150,0.1);}
  .nav-item.active{background:rgba(0,200,150,0.15);color:#00c896;border:1px solid rgba(0,200,150,0.3);}
  .card-h:hover{transform:translateY(-3px);transition:transform 0.2s;}
  .relay-btn{width:100%;padding:20px 12px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:18px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;}
  .relay-btn:hover{transform:translateY(-2px);}
  .relay-status{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.8;}
  .btn-primary{padding:12px 28px;background:linear-gradient(135deg,#00c896,#0070f3);border:none;border-radius:10px;color:white;font-size:16px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity 0.2s;}
  .btn-primary:hover{opacity:0.9;}
  input,select{font-family:'DM Sans',sans-serif;font-size:16px;outline:none;}
  input:focus{border-color:#00c896!important;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(0,200,150,0.3);border-radius:4px;}
  @keyframes aiPulse{0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.4)}50%{box-shadow:0 0 0 8px rgba(167,139,250,0)}}
  .ai-badge{animation:aiPulse 2s infinite;}
`;

// ─── AI ANALYSIS ENGINE ────────────────────────────────────────
// Rule-based analysis engine: computes anomaly detection, peak hour
// tracking, savings recommendations, bill forecasting, and an
// efficiency score from real historical sensor readings.

const HOURLY_LOG_KEY = "smartEnergy_hourlyLog";

function logHourlyUsage(power) {
  if (!power || power <= 0) return;
  try {
    const hour = new Date().getHours();
    const raw = localStorage.getItem(HOURLY_LOG_KEY);
    const log = raw ? JSON.parse(raw) : {};
    if (!log[hour]) log[hour] = { total: 0, count: 0 };
    log[hour].total += power;
    log[hour].count += 1;
    localStorage.setItem(HOURLY_LOG_KEY, JSON.stringify(log));
  } catch (e) { /* localStorage unavailable, skip silently */ }
}

function getHourlyLog() {
  try {
    const raw = localStorage.getItem(HOURLY_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function formatHour(h) {
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm}`;
}

function getHourlyChartData() {
  const log = getHourlyLog();
  const data = [];
  for (let h = 0; h < 24; h++) {
    const entry = log[h];
    data.push({ hour: formatHour(h), avg: entry ? +(entry.total / entry.count).toFixed(1) : 0 });
  }
  return data;
}

function analyzeEnergy(history, power, kwh, bill) {
  const avgPower = history.length ? history.reduce((a, b) => a + b.power, 0) / history.length : 0;

  // 1. Anomaly Detection
  const anomalyThreshold = avgPower * 1.3;
  const isAnomaly = avgPower > 5 && power > anomalyThreshold;
  const anomalyPercent = avgPower > 0 ? Math.round(((power - avgPower) / avgPower) * 100) : 0;

  // 2. Peak Usage Hours (from accumulated localStorage log)
  const log = getHourlyLog();
  const hourEntries = Object.entries(log)
    .map(([h, d]) => ({ hour: parseInt(h), avg: d.total / d.count }))
    .sort((a, b) => b.avg - a.avg);
  const peakHours = hourEntries.slice(0, 3);

  // 3. Efficiency Score (0-100): power factor + consistency of readings
  const powerFactor = 0.92;
  let variance = 0;
  if (history.length > 1 && avgPower > 0) {
    variance = Math.sqrt(history.reduce((a, b) => a + Math.pow(b.power - avgPower, 2), 0) / history.length);
  }
  const consistencyScore = avgPower > 0 ? Math.max(0, 100 - (variance / avgPower) * 100) : 100;
  const efficiencyScore = Math.round(powerFactor * 100 * 0.5 + consistencyScore * 0.5);

  // 4. Predictive Bill Forecast (trend-based, using first half vs second half of history)
  let forecastBill = parseFloat(bill);
  let trendPercent = 0;
  if (history.length >= 10) {
    const half = Math.floor(history.length / 2);
    const firstAvg = history.slice(0, half).reduce((a, b) => a + b.power, 0) / half;
    const secondAvg = history.slice(half).reduce((a, b) => a + b.power, 0) / (history.length - half);
    if (firstAvg > 0) {
      const trendFactor = secondAvg / firstAvg;
      forecastBill = (parseFloat(bill) * trendFactor);
      trendPercent = Math.round((trendFactor - 1) * 100);
    }
  }

  // 5. Smart Recommendations
  const recommendations = [];
  if (isAnomaly) {
    recommendations.push(`⚡ Unusual spike detected — current usage is ${anomalyPercent}% above your recent average. Check if a high-power device was just switched on.`);
  }
  if (power > 400) {
    recommendations.push(`💡 Usage exceeds 400W threshold. Turning off non-essential devices during peak hours could reduce your bill significantly.`);
  }
  if (peakHours.length > 0) {
    recommendations.push(`🕐 Your highest usage tends to be around ${formatHour(peakHours[0].hour)}. Shifting heavy appliance use away from this time can help balance load.`);
  }
  if (trendPercent > 10) {
    recommendations.push(`📈 Usage trending upward by ~${trendPercent}%. Monitor for devices left running unintentionally.`);
  }
  if (recommendations.length === 0) {
    recommendations.push(`✅ Usage pattern looks stable and efficient. No unusual activity detected.`);
  }

  return {
    isAnomaly, anomalyPercent,
    peakHours,
    efficiencyScore,
    forecastBill: forecastBill.toFixed(2),
    trendPercent,
    recommendations,
  };
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────
export default function Dashboard() {
  const [page, setPage]         = useState("home");
  const [dark, setDark]         = useState(true);
  const [voltage, setVoltage]   = useState(0);
  const [current, setCurrent]   = useState(0);
  const [power, setPower]       = useState(0);
  const [kwh, setKwh]           = useState(0);
  const [temp, setTemp]         = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [history, setHistory]   = useState([]);
  const [relays, setRelays]     = useState({ r1:"OFF",r2:"OFF",r3:"OFF",r4:"OFF" });
  const [customer, setCustomer] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [aiInsight, setAiInsight] = useState("Analyzing your energy data...");
  const navigate = useNavigate();
  const c = getColors(dark);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) getDoc(doc(firestore,"customers",user.uid)).then(s=>{ if(s.exists()) setCustomer(s.data()); });
    onValue(ref(db,"energy/voltage"),     s=>setVoltage(s.val()||0));
    onValue(ref(db,"energy/current"),     s=>setCurrent(s.val()||0));
    onValue(ref(db,"energy/power"),       s=>{ const v=s.val()||0; setPower(v); setHistory(p=>[...p.slice(-29),{t:new Date().toLocaleTimeString(),power:v,voltage:voltage,current:current}]); logHourlyUsage(v); });
    onValue(ref(db,"energy/kwh"),         s=>setKwh(s.val()||0));
    onValue(ref(db,"environment/temp"),   s=>setTemp(s.val()));
    onValue(ref(db,"environment/humidity"),s=>setHumidity(s.val()));
    onValue(ref(db,"device/relay"),       s=>{ const v=s.val(); if(v&&typeof v==='object') setRelays(v); else setRelays(p=>({...p,r1:v||"OFF"})); });
    onValue(ref(db,"energy/lastUpdated"), s=>setLastUpdated(s.val()));
  }, []);

  // Check every 2 seconds whether the last ESP32 timestamp is still "fresh"
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastUpdated) { setIsOnline(false); return; }
      const nowInSeconds = Math.floor(Date.now() / 1000);
      setIsOnline((nowInSeconds - lastUpdated) < 10);
    }, 2000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Fetch AI-generated insight from Gemini via Netlify serverless function
  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const avgPower = history.length ? (history.reduce((a,b)=>a+b.power,0)/history.length).toFixed(1) : 0;
        const res = await fetch("/.netlify/functions/analyze", {
          method: "POST",
          body: JSON.stringify({
            avgPower,
            peakHour: ai.peakHours.length > 0 ? formatHour(ai.peakHours[0].hour) : "N/A",
            currentPower: power.toFixed(1),
            bill: bill,
            trend: ai.trendPercent,
            anomaly: ai.isAnomaly
          })
        });
        const data = await res.json();
        setAiInsight(data.insight || "Unable to generate insight.");
      } catch (e) {
        setAiInsight("AI insight temporarily unavailable.");
      }
    };
    if (history.length > 3) fetchInsight();
    const interval = setInterval(() => { if (history.length > 3) fetchInsight(); }, 60000);
    return () => clearInterval(interval);
  }, [power]);

  const toggleRelay = key => { const u={...relays,[key]:relays[key]==="OFF"?"ON":"OFF"}; setRelays(u); set(ref(db,"device/relay"),u); };
  const handleLogout = async () => { await signOut(auth); navigate("/login"); };
  const bill = (power*24*30/1000*30).toFixed(2);
  const maxPow = Math.max(...history.map(h=>h.power),1);
  const dot = {width:8,height:8,borderRadius:"50%",background:"#00c896",display:"inline-block",boxShadow:"0 0 6px #00c896"};
  const panelStyle = {background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:16,padding:24};
  const titleStyle = {fontFamily:"'Rajdhani',sans-serif",fontSize:17,fontWeight:700,letterSpacing:"1.5px",color:c.sub,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:8};

  const ai = analyzeEnergy(history, power, kwh, bill);

  // ── PAGES ──────────────────────────────────────────────────

  // HOME
  const PageHome = () => (
    <div>
      {/* Customer Bar */}
      {customer && (
        <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:14,padding:"18px 24px",marginBottom:22,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          {[
            {label:"👤 Customer Name", val:customer.fullName,      hi:true},
            {label:"📍 Address",       val:`${customer.address}, ${customer.city}`,hi:false},
            {label:"⚡ CEB Account",   val:customer.accountNumber, hi:true},
            {label:"📞 Contact",       val:customer.phone,         hi:false},
          ].map(item=>(
            <div key={item.label}>
              <div style={{fontSize:12,color:c.muted,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>{item.label}</div>
              <div style={{fontSize:item.hi?20:17,color:item.hi?"#00c896":c.text,fontWeight:700,fontFamily:item.hi?"'Rajdhani',sans-serif":"inherit"}}>{item.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* 6 Metric Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:14,marginBottom:22}}>
        {[
          {cls:"voltage", label:"Voltage",     value:voltage.toFixed(1),                        unit:"Volts (V)",   icon:"🔌"},
          {cls:"current", label:"Current",     value:current.toFixed(2),                        unit:"Amperes (A)", icon:"⚡"},
          {cls:"power",   label:"Power",       value:power.toFixed(1),                          unit:"Watts (W)",   icon:"💡"},
          {cls:"energy",  label:"Energy",      value:kwh.toFixed(3),                            unit:"kWh",         icon:"🔋"},
          {cls:"temp",    label:"Temperature", value:temp!==null?temp.toFixed(1):"--",          unit:"°C",          icon:"🌡️"},
          {cls:"humidity",label:"Humidity",    value:humidity!==null?humidity.toFixed(1):"--",  unit:"% RH",        icon:"💧"},
        ].map(card=>(
          <div key={card.cls} className="card-h" style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:"22px 18px",position:"relative",overflow:"hidden",transition:"transform 0.2s"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:4,borderRadius:"16px 16px 0 0",background:CARD_COLORS[card.cls].top}}/>
            <div style={{position:"absolute",right:14,top:14,fontSize:26,opacity:0.13}}>{card.icon}</div>
            <div style={{fontSize:13,color:c.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12,fontWeight:600}}>{card.label}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:40,fontWeight:700,lineHeight:1,color:CARD_COLORS[card.cls].val}}>{card.value}</div>
            <div style={{fontSize:14,color:c.muted,fontWeight:500,marginTop:8}}>{card.unit}</div>
          </div>
        ))}
      </div>

      {/* Chart + Live Stats */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:22}}>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Power Usage History</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c896" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#00c896" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide/>
              <YAxis stroke={dark?"#1e293b":"#e5e7eb"} tick={{fill:c.muted,fontSize:14}} width={48}/>
              <Tooltip contentStyle={{background:c.tooltip,border:"1px solid rgba(0,200,150,0.3)",borderRadius:8,fontSize:15,color:c.text}}/>
              <Area type="monotone" dataKey="power" stroke="#00c896" strokeWidth={2.5} fill="url(#pg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Live Stats</div>
          {[
            {label:"Power Factor", val:"0.92"},
            {label:"Frequency",    val:"50.0 Hz"},
            {label:"Peak Power",   val:`${maxPow.toFixed(1)} W`},
            {label:"Status",       val: isOnline ? "● Online" : "● Offline", color: isOnline ? "#00c896" : "#fb7185"},
          ].map((row,i,arr)=>(
            <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:i===arr.length-1?"none":`1px solid ${c.statBo}`}}>
              <div style={{fontSize:17,color:c.sub,fontWeight:500}}>{row.label}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:19,fontWeight:700,color:row.color||c.text}}>{row.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div style={{...panelStyle, marginBottom:22, border:`1px solid rgba(167,139,250,0.3)`, background: dark ? "rgba(167,139,250,0.04)" : "rgba(167,139,250,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{...titleStyle, marginBottom:0}}>
            <span className="ai-badge" style={{...dot, background:"#a78bfa", boxShadow:"0 0 6px #a78bfa"}}/>
            🤖 AI Energy Analysis
          </div>
          <div style={{fontSize:12,color:c.muted,fontStyle:"italic"}}>Powered by pattern analysis engine</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
          {/* Efficiency Score */}
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:13,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Efficiency Score</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:34,fontWeight:700,color: ai.efficiencyScore>=70?"#00c896":ai.efficiencyScore>=40?"#fbbf24":"#fb7185"}}>{ai.efficiencyScore}<span style={{fontSize:18,color:c.muted}}>/100</span></div>
          </div>
          {/* Anomaly Status */}
          <div style={{background:c.card,border:`1px solid ${ai.isAnomaly?"rgba(225,29,72,0.4)":c.cardBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:13,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Anomaly Status</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color: ai.isAnomaly?"#fb7185":"#00c896"}}>{ai.isAnomaly ? `⚠️ +${ai.anomalyPercent}%` : "✅ Normal"}</div>
          </div>
          {/* Forecast Bill */}
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:13,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Forecast Bill</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:"#a78bfa"}}>LKR {ai.forecastBill}</div>
            {ai.trendPercent !== 0 && <div style={{fontSize:12,color:ai.trendPercent>0?"#fb7185":"#00c896",marginTop:4}}>{ai.trendPercent>0?"▲":"▼"} {Math.abs(ai.trendPercent)}% trend</div>}
          </div>
          {/* Peak Hour */}
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:13,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Peak Usage Hour</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:700,color:"#fbbf24"}}>{ai.peakHours.length>0 ? formatHour(ai.peakHours[0].hour) : "Gathering data..."}</div>
          </div>
        </div>

        {/* Gemini AI Insight */}
        <div style={{background:c.panel,border:`1px solid rgba(167,139,250,0.3)`,borderRadius:12,padding:18,marginBottom:14}}>
          <div style={{fontSize:14,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>✨ Gemini AI Insight</div>
          <div style={{fontSize:15,color:c.sub,lineHeight:1.7}}>{aiInsight}</div>
        </div>

        {/* Recommendations */}
        <div style={{background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:12,padding:18}}>
          <div style={{fontSize:14,color:c.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>💡 Smart Recommendations</div>
          {ai.recommendations.map((rec,i)=>(
            <div key={i} style={{fontSize:15,color:c.sub,padding:"8px 0",borderBottom:i===ai.recommendations.length-1?"none":`1px solid ${c.statBo}`,lineHeight:1.6}}>{rec}</div>
          ))}
        </div>
      </div>

      {/* Bill + Devices */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Monthly Bill Estimate</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:46,fontWeight:700,color:"#00c896",margin:"10px 0 8px",textShadow:"0 0 20px rgba(0,200,150,0.3)"}}>LKR {bill}</div>
          <div style={{fontSize:15,color:c.muted}}>Based on current usage × 24 hours × 30 days</div>
          {power>400&&<div style={{background:"rgba(225,29,72,0.1)",border:"1px solid rgba(225,29,72,0.3)",borderRadius:10,padding:"14px 16px",marginTop:16}}>
            <div style={{fontSize:16,color:"#fb7185",fontWeight:500}}>⚠️ High usage! {power.toFixed(1)}W exceeds 400W threshold.</div>
          </div>}
        </div>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Quick Device Control</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {["r1","r2","r3","r4"].map((key,i)=>(
              <button key={key} className="relay-btn" onClick={()=>toggleRelay(key)}
                style={{border:relays[key]==="ON"?"1px solid rgba(0,200,150,0.4)":`1px solid ${c.relayBo}`,background:relays[key]==="ON"?"rgba(0,200,150,0.15)":c.relayBg,color:relays[key]==="ON"?"#00c896":c.relayTx,boxShadow:relays[key]==="ON"?"0 0 14px rgba(0,200,150,0.15)":"none"}}>
                <span>{relays[key]==="ON"?"🟢":"⚫"} Device {i+1}</span>
                <span className="relay-status">{relays[key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ANALYTICS
  const PageAnalytics = () => (
    <div style={{display:"grid",gap:20}}>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Power Usage — Last 30 Readings</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#fb7185" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke={dark?"rgba(255,255,255,0.05)":"#f0f0f0"}/>
            <XAxis dataKey="t" hide/>
            <YAxis tick={{fill:c.muted,fontSize:14}} width={48}/>
            <Tooltip contentStyle={{background:c.tooltip,border:"1px solid rgba(251,113,133,0.3)",borderRadius:8,fontSize:15,color:c.text}}/>
            <Area type="monotone" dataKey="power" stroke="#fb7185" strokeWidth={2.5} fill="url(#ag)" dot={false} name="Power (W)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Voltage History</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid stroke={dark?"rgba(255,255,255,0.05)":"#f0f0f0"}/>
              <XAxis dataKey="t" hide/>
              <YAxis tick={{fill:c.muted,fontSize:14}} width={48} domain={[200,250]}/>
              <Tooltip contentStyle={{background:c.tooltip,borderRadius:8,fontSize:15,color:c.text}}/>
              <Line type="monotone" dataKey="voltage" stroke="#60efff" strokeWidth={2} dot={false} name="Voltage (V)"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Current History</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={history.slice(-10)}>
              <CartesianGrid stroke={dark?"rgba(255,255,255,0.05)":"#f0f0f0"}/>
              <XAxis dataKey="t" hide/>
              <YAxis tick={{fill:c.muted,fontSize:14}} width={48}/>
              <Tooltip contentStyle={{background:c.tooltip,borderRadius:8,fontSize:15,color:c.text}}/>
              <Bar dataKey="current" fill="#fbbf24" radius={[4,4,0,0]} name="Current (A)"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {label:"Average Power",  val:`${history.length?( history.reduce((a,b)=>a+b.power,0)/history.length).toFixed(1):0} W`, color:"#fb7185"},
          {label:"Peak Power",     val:`${maxPow.toFixed(1)} W`,                                                                  color:"#f97316"},
          {label:"Total Readings", val:`${history.length}`,                                                                       color:"#a78bfa"},
          {label:"Est. Daily kWh", val:`${(power*24/1000).toFixed(2)} kWh`,                                                      color:"#00c896"},
        ].map(s=>(
          <div key={s.label} style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:30,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // AI ANALYSIS (full page)
  const PageAI = () => {
    const hourlyData = getHourlyChartData();
    const avgPower = history.length ? history.reduce((a,b)=>a+b.power,0)/history.length : 0;
    return (
      <div style={{display:"grid",gap:20}}>

        {/* Top Summary Row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:24,textAlign:"center"}}>
            <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Efficiency Score</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:40,fontWeight:700,color: ai.efficiencyScore>=70?"#00c896":ai.efficiencyScore>=40?"#fbbf24":"#fb7185"}}>{ai.efficiencyScore}<span style={{fontSize:20,color:c.muted}}>/100</span></div>
            <div style={{fontSize:13,color:c.muted,marginTop:8}}>Based on power factor + usage consistency</div>
          </div>
          <div style={{background:c.card,border:`1px solid ${ai.isAnomaly?"rgba(225,29,72,0.4)":c.cardBo}`,borderRadius:16,padding:24,textAlign:"center"}}>
            <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Anomaly Status</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:700,color: ai.isAnomaly?"#fb7185":"#00c896"}}>{ai.isAnomaly ? `⚠️ +${ai.anomalyPercent}%` : "✅ Normal"}</div>
            <div style={{fontSize:13,color:c.muted,marginTop:8}}>vs rolling average of {avgPower.toFixed(1)} W</div>
          </div>
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:24,textAlign:"center"}}>
            <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Forecast Bill</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:700,color:"#a78bfa"}}>LKR {ai.forecastBill}</div>
            <div style={{fontSize:13,color:ai.trendPercent>0?"#fb7185":"#00c896",marginTop:8}}>{ai.trendPercent!==0?`${ai.trendPercent>0?"▲":"▼"} ${Math.abs(ai.trendPercent)}% trend`:"Stable trend"}</div>
          </div>
          <div style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:24,textAlign:"center"}}>
            <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>Peak Usage Hour</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:24,fontWeight:700,color:"#fbbf24"}}>{ai.peakHours.length>0 ? formatHour(ai.peakHours[0].hour) : "Gathering data..."}</div>
            <div style={{fontSize:13,color:c.muted,marginTop:8}}>Highest average recorded hour</div>
          </div>
        </div>

        {/* Hourly Usage Pattern Chart */}
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Hourly Usage Pattern (24-Hour)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <CartesianGrid stroke={dark?"rgba(255,255,255,0.05)":"#f0f0f0"}/>
              <XAxis dataKey="hour" tick={{fill:c.muted,fontSize:11}} interval={2}/>
              <YAxis tick={{fill:c.muted,fontSize:13}} width={48}/>
              <Tooltip contentStyle={{background:c.tooltip,border:"1px solid rgba(167,139,250,0.3)",borderRadius:8,fontSize:14,color:c.text}}/>
              <Bar dataKey="avg" fill="#a78bfa" radius={[4,4,0,0]} name="Avg Power (W)"/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{fontSize:13,color:c.muted,marginTop:10,fontStyle:"italic"}}>Builds up automatically the longer your system runs — more data means more accurate peak-hour detection.</div>
        </div>

        {/* Top 3 Peak Hours List */}
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Top Usage Hours</div>
          {ai.peakHours.length > 0 ? ai.peakHours.map((h,i)=>(
            <div key={h.hour} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:i===ai.peakHours.length-1?"none":`1px solid ${c.statBo}`}}>
              <div style={{fontSize:17,color:c.sub,fontWeight:500}}>#{i+1} — {formatHour(h.hour)}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:19,fontWeight:700,color:"#fbbf24"}}>{h.avg.toFixed(1)} W avg</div>
            </div>
          )) : (
            <div style={{fontSize:15,color:c.muted,padding:"14px 0"}}>Not enough data yet — keep the system running longer to build hourly usage patterns.</div>
          )}
        </div>

        {/* Bill Forecast Breakdown */}
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Predictive Bill Forecast Breakdown</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            <div style={{background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:12,padding:18,textAlign:"center"}}>
              <div style={{fontSize:13,color:c.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase"}}>Current Estimate</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:c.text}}>LKR {bill}</div>
            </div>
            <div style={{background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:12,padding:18,textAlign:"center"}}>
              <div style={{fontSize:13,color:c.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase"}}>AI Forecast</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:"#a78bfa"}}>LKR {ai.forecastBill}</div>
            </div>
            <div style={{background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:12,padding:18,textAlign:"center"}}>
              <div style={{fontSize:13,color:c.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase"}}>Usage Trend</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:ai.trendPercent>0?"#fb7185":"#00c896"}}>{ai.trendPercent>0?"▲":ai.trendPercent<0?"▼":"—"} {Math.abs(ai.trendPercent)}%</div>
            </div>
          </div>
        </div>

        {/* Gemini AI Insight */}
        <div style={{...panelStyle, border:`1px solid rgba(167,139,250,0.3)`, background: dark ? "rgba(167,139,250,0.04)" : "rgba(167,139,250,0.06)"}}>
          <div style={titleStyle}><span style={{...dot, background:"#a78bfa", boxShadow:"0 0 6px #a78bfa"}}/>✨ Gemini AI Insight</div>
          <div style={{fontSize:16,color:c.sub,lineHeight:1.8}}>{aiInsight}</div>
        </div>

        {/* Full Recommendations */}
        <div style={{...panelStyle, border:`1px solid rgba(167,139,250,0.3)`, background: dark ? "rgba(167,139,250,0.04)" : "rgba(167,139,250,0.06)"}}>
          <div style={titleStyle}><span style={{...dot, background:"#a78bfa", boxShadow:"0 0 6px #a78bfa"}}/>💡 Smart Recommendations</div>
          {ai.recommendations.map((rec,i)=>(
            <div key={i} style={{fontSize:16,color:c.sub,padding:"12px 0",borderBottom:i===ai.recommendations.length-1?"none":`1px solid ${c.statBo}`,lineHeight:1.7}}>{rec}</div>
          ))}
        </div>

        {/* How it works (for VIVA explanation) */}
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>How This Analysis Works</div>
          <div style={{fontSize:15,color:c.muted,lineHeight:1.8}}>
            This engine uses rule-based statistical analysis on real sensor data collected from your ESP32 device via Firebase:
            <br/>• <b style={{color:c.sub}}>Anomaly Detection</b> compares live power readings against a rolling average, flagging spikes over 30%.
            <br/>• <b style={{color:c.sub}}>Peak Hour Tracking</b> accumulates hourly averages over time to identify your highest-usage periods.
            <br/>• <b style={{color:c.sub}}>Efficiency Score</b> combines power factor with the consistency (standard deviation) of your usage.
            <br/>• <b style={{color:c.sub}}>Bill Forecasting</b> compares recent usage trend against your historical average to project next month's cost.
          </div>
        </div>
      </div>
    );
  };

  // DEVICES
  const PageDevices = () => (
    <div style={{display:"grid",gap:20}}>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Device Control Panel</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
          {["r1","r2","r3","r4"].map((key,i)=>(
            <div key={key} style={{background:c.card,border:`2px solid ${relays[key]==="ON"?"rgba(0,200,150,0.4)":c.cardBo}`,borderRadius:16,padding:24,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.2s"}}>
              <div>
                <div style={{fontSize:20,fontWeight:700,color:c.text,marginBottom:6}}>Device {i+1}</div>
                <div style={{fontSize:16,color:relays[key]==="ON"?"#00c896":c.muted,fontWeight:600}}>{relays[key]==="ON"?"● Running":"○ Standby"}</div>
              </div>
              <button onClick={()=>toggleRelay(key)} style={{padding:"14px 28px",borderRadius:12,border:"none",background:relays[key]==="ON"?"linear-gradient(135deg,#e11d48,#fb7185)":"linear-gradient(135deg,#00c896,#0070f3)",color:"white",fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>
                {relays[key]==="ON" ? "Turn OFF" : "Turn ON"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Device Status Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[
            {label:"Total Devices",  val:"4",                                                                  color:"#60efff"},
            {label:"Active Now",     val:`${Object.values(relays).filter(v=>v==="ON").length}`,                color:"#00c896"},
            {label:"Standby",        val:`${Object.values(relays).filter(v=>v==="OFF").length}`,               color:"#fbbf24"},
            {label:"Power by Devices",val:`${power.toFixed(0)} W`,                                            color:"#fb7185"},
          ].map(s=>(
            <div key={s.label} style={{background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:14,padding:20,textAlign:"center"}}>
              <div style={{fontSize:14,color:c.muted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:32,fontWeight:700,color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // BILLING
  const PageBilling = () => {
    const daily   = (power*24/1000*30).toFixed(2);
    const weekly  = (power*24*7/1000*30).toFixed(2);
    const monthly = bill;
    const yearly  = (power*24*365/1000*30).toFixed(2);
    return (
      <div style={{display:"grid",gap:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[
            {label:"Daily Estimate",   val:`LKR ${daily}`,   color:"#60efff"},
            {label:"Weekly Estimate",  val:`LKR ${weekly}`,  color:"#fbbf24"},
            {label:"Monthly Estimate", val:`LKR ${monthly}`, color:"#00c896"},
            {label:"Yearly Estimate",  val:`LKR ${yearly}`,  color:"#fb7185"},
          ].map(s=>(
            <div key={s.label} style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:24,textAlign:"center"}}>
              <div style={{fontSize:14,color:c.muted,marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:700,color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={panelStyle}>
          <div style={titleStyle}><span style={dot}/>Billing Details</div>
          {[
            {label:"Current Power Usage",      val:`${power.toFixed(1)} W`},
            {label:"Energy Consumed",          val:`${kwh.toFixed(3)} kWh`},
            {label:"Rate per kWh",             val:"LKR 30.00"},
            {label:"CEB Account Number",       val:customer?.accountNumber||"--"},
            {label:"Customer Name",            val:customer?.fullName||"--"},
            {label:"Service Address",          val:customer?`${customer.address}, ${customer.city}`:"--"},
          ].map((row,i,arr)=>(
            <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:i===arr.length-1?"none":`1px solid ${c.statBo}`}}>
              <div style={{fontSize:18,color:c.sub,fontWeight:500}}>{row.label}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:700,color:c.text}}>{row.val}</div>
            </div>
          ))}
        </div>
        {power>400&&(
          <div style={{background:"rgba(225,29,72,0.1)",border:"1px solid rgba(225,29,72,0.3)",borderRadius:14,padding:20}}>
            <div style={{fontSize:18,color:"#fb7185",fontWeight:600}}>⚠️ Your current power usage ({power.toFixed(1)}W) is high. Reducing usage can save you LKR {((power-300)*24*30/1000*30).toFixed(0)} per month!</div>
          </div>
        )}
      </div>
    );
  };

  // SETTINGS
  const PageSettings = () => (
    <div style={{display:"grid",gap:20}}>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Account Information</div>
        {customer && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {[
              {label:"Full Name",       val:customer.fullName},
              {label:"Email Address",   val:customer.email},
              {label:"Phone Number",    val:customer.phone},
              {label:"NIC Number",      val:customer.nic||"Not provided"},
              {label:"Street Address",  val:customer.address},
              {label:"City",            val:customer.city},
              {label:"District",        val:customer.district||"Not provided"},
              {label:"CEB Account No",  val:customer.accountNumber},
            ].map(f=>(
              <div key={f.label} style={{marginBottom:4}}>
                <div style={{fontSize:13,color:c.muted,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>{f.label}</div>
                <div style={{background:c.input,border:`1px solid ${c.inputBo}`,borderRadius:10,padding:"12px 16px",fontSize:17,color:c.text,fontWeight:500}}>{f.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Display Settings</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderBottom:`1px solid ${c.statBo}`}}>
          <div>
            <div style={{fontSize:18,color:c.text,fontWeight:600,marginBottom:4}}>Theme</div>
            <div style={{fontSize:15,color:c.muted}}>Switch between dark and light mode</div>
          </div>
          <button onClick={()=>setDark(d=>!d)} style={{padding:"12px 24px",borderRadius:10,border:`1px solid ${c.cardBo}`,background:c.card,color:c.text,fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            {dark?"☀️ Switch to Light":"🌙 Switch to Dark"}
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0"}}>
          <div>
            <div style={{fontSize:18,color:c.text,fontWeight:600,marginBottom:4}}>Sign Out</div>
            <div style={{fontSize:15,color:c.muted}}>Log out of your account</div>
          </div>
          <button onClick={handleLogout} style={{padding:"12px 24px",borderRadius:10,border:"1px solid rgba(225,29,72,0.3)",background:"rgba(225,29,72,0.1)",color:"#fb7185",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            ⏻ Logout
          </button>
        </div>
      </div>
    </div>
  );

  // ABOUT
  const PageAbout = () => (
    <div style={{display:"grid",gap:20}}>
      <div style={{...panelStyle,textAlign:"center",padding:40}}>
        <div style={{fontSize:56,marginBottom:16}}>⚡</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:32,fontWeight:700,background:"linear-gradient(90deg,#00c896,#60efff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:10}}>SMART ENERGY SYSTEM</div>
        <div style={{fontSize:17,color:c.muted,marginBottom:8,letterSpacing:"2px",textTransform:"uppercase"}}>Cloud-Based AI Energy Management & Smart Automation</div>
        <div style={{fontSize:17,color:c.sub,maxWidth:600,margin:"0 auto",lineHeight:1.8}}>
          A real-time IoT-based energy monitoring and automation system designed for Sri Lankan households and businesses. Monitor your energy consumption, control devices remotely, and reduce electricity bills.
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {[
          {icon:"🔌",title:"IoT Integration",    desc:"ESP32 microcontroller with ACS712 current sensor and DHT11 temperature sensor for real-time data collection."},
          {icon:"☁️",title:"Cloud Based",        desc:"Firebase Realtime Database stores and syncs all energy data instantly across all devices."},
          {icon:"🤖",title:"AI Powered",         desc:"Rule-based analysis engine detects anomalies, forecasts bills, and provides smart recommendations from real usage patterns."},
          {icon:"📱",title:"Web Dashboard",      desc:"Professional React web application with real-time charts, device control, and billing estimates."},
          {icon:"🔐",title:"Secure Login",       desc:"Firebase Authentication with customer profiles including CEB account details and address."},
          {icon:"🇱🇰",title:"Made for Sri Lanka", desc:"Designed specifically for Sri Lankan electricity billing system with LKR calculations."},
        ].map(f=>(
          <div key={f.title} style={{background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:16,padding:24}}>
            <div style={{fontSize:36,marginBottom:14}}>{f.icon}</div>
            <div style={{fontSize:20,fontWeight:700,color:c.text,marginBottom:10}}>{f.title}</div>
            <div style={{fontSize:16,color:c.muted,lineHeight:1.7}}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={panelStyle}>
        <div style={titleStyle}><span style={dot}/>Technology Stack</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[
            {label:"Hardware",  val:"ESP32 + ACS712 + DHT11", color:"#60efff"},
            {label:"Frontend",  val:"React.js",                color:"#fbbf24"},
            {label:"Database",  val:"Firebase RTDB",           color:"#f97316"},
            {label:"Auth",      val:"Firebase Auth",           color:"#00c896"},
          ].map(t=>(
            <div key={t.label} style={{textAlign:"center",padding:20,background:c.panel,border:`1px solid ${c.panelBo}`,borderRadius:14}}>
              <div style={{fontSize:13,color:c.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>{t.label}</div>
              <div style={{fontSize:18,fontWeight:700,color:t.color}}>{t.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const pages = { home:<PageHome/>, analytics:<PageAnalytics/>, ai:<PageAI/>, devices:<PageDevices/>, billing:<PageBilling/>, settings:<PageSettings/>, about:<PageAbout/> };

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:"flex",minHeight:"100vh",background:c.bg,backgroundImage:c.bgGrad,transition:"all 0.3s"}}>

        {/* SIDEBAR */}
        <div style={{width:240,minHeight:"100vh",background:c.sidebar,borderRight:`1px solid ${c.sideB}`,padding:"24px 16px",display:"flex",flexDirection:"column",flexShrink:0}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:36,paddingBottom:20,borderBottom:`1px solid ${c.sideB}`}}>
            <div style={{width:42,height:42,background:"linear-gradient(135deg,#00c896,#0070f3)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 0 18px rgba(0,200,150,0.35)"}}>⚡</div>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:16,fontWeight:700,background:"linear-gradient(90deg,#00c896,#60efff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"1px"}}>SMART ENERGY</div>
              <div style={{fontSize:11,color:c.muted,letterSpacing:"1px"}}>Sri Lanka 🇱🇰</div>
            </div>
          </div>

          {/* Nav Items */}
          <nav style={{flex:1}}>
            {NAV.map(item=>(
              <div key={item.id} className={`nav-item${page===item.id?" active":""}`} onClick={()=>setPage(item.id)}
                style={{color:page===item.id?"#00c896":c.sub}}>
                <span style={{fontSize:22}}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          {/* Live Badge */}
          <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${c.sideB}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:isOnline?"rgba(0,200,150,0.1)":"rgba(225,29,72,0.1)",border:isOnline?"1px solid rgba(0,200,150,0.2)":"1px solid rgba(225,29,72,0.2)",borderRadius:10}}>
              <div className="live-dot" style={{width:8,height:8,borderRadius:"50%",background:isOnline?"#00c896":"#fb7185"}}/>
              <span style={{fontSize:14,color:isOnline?"#00c896":"#fb7185",fontWeight:600}}>{isOnline?"System Online":"System Offline"}</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"auto"}}>
          {/* Top Bar */}
          <div style={{padding:"18px 28px",borderBottom:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:c.sidebar,flexShrink:0}}>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:c.text,letterSpacing:"1px"}}>{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</div>
              <div style={{fontSize:14,color:c.muted,marginTop:2}}>{new Date().toLocaleDateString("en-LK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setDark(d=>!d)} style={{background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",border:`1px solid ${c.cardBo}`,borderRadius:20,padding:"8px 18px",fontSize:15,color:c.sub,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>
                {dark?"☀️ Light":"🌙 Dark"}
              </button>
              {customer&&<div style={{fontSize:16,color:c.sub,fontWeight:600,padding:"8px 16px",background:c.card,border:`1px solid ${c.cardBo}`,borderRadius:20}}>👤 {customer.fullName}</div>}
            </div>
          </div>

          {/* Page Content */}
          <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
            {pages[page]}
          </div>
        </div>
      </div>
    </>
  );
}