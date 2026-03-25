"use client";
import { useState, useEffect, useMemo } from "react";

/*  GHOST TAX — REVENUE COMMAND CENTER (ADMIN DASHBOARD)
    Real-time operational cockpit for Edith.
    Connected to Supabase via /api/admin/stats.
    Target markets: US + Germany.
    100% USD display for revenue. Bloomberg terminal density. */

const V="#060912",A="#3b82f6",AH="#60a5fa",T1="#e0e6f2",T2="#8d9bb5",T3="#55637d",RD="#ef4444",OR="#3b82f6",GR="#22c55e",TL="#34d399",BD="rgba(36,48,78,0.32)",MO="ui-monospace,'Cascadia Code','Fira Code',monospace",SA="system-ui,-apple-system,sans-serif";
const gl={background:"rgba(11,14,24,0.72)",backdropFilter:"blur(18px) saturate(1.15)",WebkitBackdropFilter:"blur(18px) saturate(1.15)",border:"1px solid "+BD,borderRadius:12,boxShadow:"0 4px 32px rgba(0,0,0,0.28)"};
function fmt(n,s){if(!n&&n!==0)return"—";if(s&&n>=1e6)return"€"+(n/1e6).toFixed(1)+"M";if(s&&n>=1e4)return"€"+Math.round(n/1e3)+"k";return"€"+Math.round(n).toLocaleString("en-US");}

const STATUS_COL={pending:OR,processing:AH,delivered:TL,followup_scheduled:GR,monitoring_active:A,monitoring_cancelled:T3,monitoring_paused:RD,failed:RD};
const STATUS_BG={pending:"rgba(59,130,246,0.06)",processing:"rgba(96,165,250,0.06)",delivered:"rgba(52,211,153,0.06)",followup_scheduled:"rgba(34,197,94,0.06)",monitoring_active:"rgba(59,130,246,0.08)",failed:"rgba(239,68,68,0.06)"};

// Mini Radar (48x48)
function MiniRadar({metrics}){
  if(!metrics||metrics.length<3)return <div style={{width:48,height:48}}/>;
  const cx=24,cy=24,R=20,n=metrics.length,step=360/n;
  function xy(ang,r){const rd=(ang-90)*Math.PI/180;return[cx+r*Math.cos(rd),cy+r*Math.sin(rd)];}
  const pts=metrics.map((m,i)=>{const nm=1-m.p/100;return xy(i*step,R*Math.max(0.08,nm));}).map(p=>p[0]+","+p[1]).join(" ");
  const cols={ex:TL,gd:GR,wn:OR,cr:RD};
  return(
    <svg viewBox="0 0 48 48" width="48" height="48">
      <polygon points={metrics.map((_,i)=>{const p=xy(i*step,R);return p[0]+","+p[1];}).join(" ")} fill="none" stroke="rgba(36,48,78,0.25)" strokeWidth="0.5"/>
      <polygon points={pts} fill="rgba(59,130,246,0.12)" stroke={A} strokeWidth="1" strokeLinejoin="round"/>
      {metrics.map((m,i)=>{const nm=1-m.p/100;const p=xy(i*step,R*Math.max(0.08,nm));const v=m.p<=25?"ex":m.p<=50?"gd":m.p<=75?"wn":"cr";return <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={cols[v]} stroke={V} strokeWidth="0.8"/>;})}
    </svg>
  );
}

function timeAgo(iso){
  if(!iso)return"—";
  const ms=Date.now()-new Date(iso).getTime();
  const min=Math.floor(ms/60000);
  if(min<60)return min+"m";
  const hrs=Math.floor(min/60);
  if(hrs<24)return hrs+"h";
  return Math.floor(hrs/24)+"d";
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function AdminDashboard(){
  const[authed,setAuthed]=useState(false);
  const[token,setToken]=useState("");
  const[tab,setTab]=useState("overview"); // overview, leads, audits, drip, health
  const[stats,setStats]=useState(null);
  const[leads,setLeads]=useState([]);
  const[audits,setAudits]=useState([]);
  const[health,setHealth]=useState(null);
  const[loading,setLoading]=useState(false);

  // Fetch data after auth
  useEffect(()=>{
    if(!authed)return;
    setLoading(true);

    // Fetch health
    fetch("/api/health").then(r=>r.json()).then(d=>setHealth(d)).catch(()=>{});

    // Fetch admin stats
    fetch("/api/admin/stats",{headers:{"x-admin-token":token}})
      .then(r=>r.json())
      .then(d=>{
        if(d.error){console.error(d.error);return;}
        setStats(d.stats||null);
        setLeads(d.leads||[]);
        setAudits(d.audits||[]);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[authed,token]);

  // Revenue calculations
  const revenue=useMemo(()=>{
    if(!audits.length)return{railA:0,railB:0,total:0,thisMonth:0,deals:0};
    const paid=audits.filter(a=>["delivered","followup_scheduled","report_persisted"].includes(a.status));
    const monitoring=audits.filter(a=>a.status==="monitoring_active");
    const railA=paid.reduce((s,a)=>{const m=a.metadata||{};return s+(parseInt(m.amount)||990);},0);
    const railB=monitoring.length*2000;
    const now=new Date();
    const thisMonth=paid.filter(a=>{const d=new Date(a.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,a)=>{const m=a.metadata||{};return s+(parseInt(m.amount)||990);},0);
    return{railA,railB,total:railA+railB,thisMonth,deals:paid.length,monitoringActive:monitoring.length};
  },[audits]);

  const funnel=useMemo(()=>{
    const scanned=leads.length;
    const inDrip=leads.filter(l=>l.status==="active"&&!l.converted).length;
    const converted=leads.filter(l=>l.converted).length;
    const delivered=audits.filter(a=>["delivered","followup_scheduled","report_persisted"].includes(a.status)).length;
    return{scanned,inDrip,converted,delivered};
  },[leads,audits]);

  // ── AUTH GATE ──────────────────────────────────
  if(!authed){
    return(
      <div style={{minHeight:"100vh",background:V,fontFamily:SA,color:T1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{...gl,padding:28,width:360,textAlign:"center"}}>
          <p style={{fontSize:10,fontFamily:MO,letterSpacing:".2em",color:A,marginBottom:8}}>GHOST TAX</p>
          <p style={{fontSize:16,fontWeight:700,marginBottom:4}}>Revenue Command Center</p>
          <p style={{fontSize:11,color:T2,marginBottom:16}}>Enter ADMIN_TOKEN to access operations.</p>
          <input
            type="password" value={token}
            onChange={e=>setToken(e.target.value)}
            style={{width:"100%",padding:"10px 12px",borderRadius:7,border:"1px solid #1e2640",background:"#080b14",color:T1,fontSize:13,fontFamily:MO,outline:"none",boxSizing:"border-box",marginBottom:12,textAlign:"center"}}
            onKeyDown={e=>{if(e.key==="Enter"&&token.length>3)setAuthed(true);}}
          />
          <button onClick={()=>{if(token.length>3)setAuthed(true);}}
            style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:token.length>3?A:"#131828",color:token.length>3?"#fff":T3,fontSize:12,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",cursor:token.length>3?"pointer":"not-allowed"}}>
            AUTHENTICATE
          </button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:V,fontFamily:SA,color:T1,padding:"16px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontFamily:MO,fontWeight:700,letterSpacing:".06em",color:A}}>GHOST TAX</span>
            <span style={{fontSize:8,fontFamily:MO,color:T3,padding:"2px 6px",borderRadius:3,border:"1px solid "+BD}}>REVENUE COMMAND CENTER</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {health&&<span style={{fontSize:9,fontFamily:MO,color:health.status==="ok"?TL:health.status==="degraded"?OR:RD}}>● {health.status.toUpperCase()}</span>}
            <button onClick={()=>{setAuthed(false);setToken("");}} style={{fontSize:9,color:T3,background:"none",border:"1px solid "+BD,borderRadius:5,padding:"4px 10px",cursor:"pointer"}}>LOGOUT</button>
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16}}>
          {[["overview","Overview"],["leads","Leads Pipeline"],["audits","Audit Requests"],["drip","Drip Stats"],["health","System Health"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{padding:"6px 14px",borderRadius:6,border:"none",fontSize:10,fontFamily:MO,fontWeight:tab===id?700:500,background:tab===id?A+"18":"transparent",color:tab===id?AH:T3,cursor:"pointer"}}>
              {label}
            </button>
          ))}
        </div>

        {loading&&<div style={{textAlign:"center",padding:40}}><p style={{fontSize:12,color:T3}}>Loading data...</p></div>}

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab==="overview"&&!loading&&(
          <>
            {/* Revenue KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:16}}>
              {[
                {l:"TOTAL REVENUE",v:fmt(revenue.total,true),c:TL},
                {l:"THIS MONTH",v:fmt(revenue.thisMonth,true),c:GR},
                {l:"RAIL A ($990+)",v:revenue.deals+" deals",c:AH},
                {l:"RAIL B MONITOR",v:revenue.monitoringActive+" active",c:A},
                {l:"LEADS IN DRIP",v:funnel.inDrip,c:OR},
                {l:"CONVERSION RATE",v:funnel.scanned>0?Math.round(funnel.converted/Math.max(1,funnel.scanned)*100)+"%":"—",c:TL},
              ].map(kpi=>(
                <div key={kpi.l} style={{...gl,padding:12,textAlign:"center"}}>
                  <p style={{fontSize:7.5,color:T3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{kpi.l}</p>
                  <p style={{fontFamily:MO,fontSize:18,fontWeight:800,color:kpi.c}}>{kpi.v}</p>
                </div>
              ))}
            </div>

            {/* Funnel Visualization */}
            <div style={{...gl,padding:20,marginBottom:16}}>
              <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".1em",marginBottom:12}}>CONVERSION FUNNEL</p>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
                {[
                  {l:"Leads Captured",v:funnel.scanned,c:T2},
                  {l:"In Drip",v:funnel.inDrip,c:OR},
                  {l:"Converted",v:funnel.converted,c:TL},
                  {l:"Delivered",v:funnel.delivered,c:GR},
                ].map((step,i)=>{
                  const max=Math.max(1,funnel.scanned);
                  const h=Math.max(8,Math.round(step.v/max*60));
                  return(
                    <div key={i} style={{flex:1,textAlign:"center"}}>
                      <div style={{height:h,background:step.c+"30",borderRadius:4,marginBottom:4,border:`1px solid ${step.c}40`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontFamily:MO,fontSize:14,fontWeight:800,color:step.c}}>{step.v}</span>
                      </div>
                      <p style={{fontSize:8,color:T3,fontFamily:MO}}>{step.l}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue Target Tracker */}
            <div style={{...gl,padding:20,marginBottom:16}}>
              <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".1em",marginBottom:12}}>TARGET: 7M EUR</p>
              <div style={{height:8,background:"rgba(0,0,0,0.2)",borderRadius:4,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:Math.min(100,revenue.total/7_000_000*100)+"%",background:`linear-gradient(90deg,${A},${TL})`,borderRadius:4,transition:"width 1s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,fontFamily:MO,color:T2}}>{fmt(revenue.total,true)} earned</span>
                <span style={{fontSize:10,fontFamily:MO,color:T3}}>{fmt(7_000_000-revenue.total,true)} remaining</span>
              </div>
            </div>

            {/* Recent Audits */}
            <div style={{...gl,padding:16}}>
              <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".1em",marginBottom:12}}>RECENT AUDIT REQUESTS</p>
              {audits.slice(0,8).map((a,i)=>(
                <div key={a.id||i} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 0.6fr 0.6fr 80px",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(36,48,78,0.12)",alignItems:"center"}}>
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:T1}}>{a.company_name||a.domain||"—"}</p>
                    <p style={{fontSize:9,color:T3}}>{a.email}</p>
                  </div>
                  <span style={{fontSize:10,fontFamily:MO,color:T2}}>{a.domain}</span>
                  <span style={{fontSize:10,fontFamily:MO,color:T2}}>{a.rail||"A"}</span>
                  <span style={{fontSize:9,fontFamily:MO,color:T3}}>{timeAgo(a.created_at)}</span>
                  <span style={{fontSize:8,fontFamily:MO,fontWeight:600,padding:"3px 8px",borderRadius:4,textTransform:"uppercase",letterSpacing:".04em",textAlign:"center",color:STATUS_COL[a.status]||T3,background:STATUS_BG[a.status]||"transparent"}}>{a.status}</span>
                </div>
              ))}
              {!audits.length&&<p style={{fontSize:12,color:T3,textAlign:"center",padding:20}}>No audit requests yet. Revenue starts with the first scan.</p>}
            </div>
          </>
        )}

        {/* ═══ LEADS TAB ═══ */}
        {tab==="leads"&&!loading&&(
          <div style={{...gl,padding:16}}>
            <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".1em",marginBottom:12}}>OUTREACH LEADS ({leads.length})</p>
            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 0.5fr 0.5fr 0.5fr 80px",gap:8,padding:"6px 0",borderBottom:"1px solid "+BD,fontSize:8,fontFamily:MO,color:T3,textTransform:"uppercase"}}>
              <span>Company / Email</span><span>Domain</span><span>Drip Step</span><span>Source</span><span>Time</span><span>Status</span>
            </div>
            {leads.slice(0,50).map((l,i)=>(
              <div key={l.id||i} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 0.5fr 0.5fr 0.5fr 80px",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(36,48,78,0.08)",alignItems:"center"}}>
                <div>
                  <p style={{fontSize:11,fontWeight:600,color:T1}}>{l.company||"—"}</p>
                  <p style={{fontSize:9,color:T3}}>{l.email}</p>
                </div>
                <span style={{fontSize:10,fontFamily:MO,color:T2}}>{l.domain||"—"}</span>
                <span style={{fontSize:12,fontFamily:MO,fontWeight:700,color:l.drip_step>=4?TL:l.drip_step>=2?OR:T2}}>T{l.drip_step||0}/5</span>
                <span style={{fontSize:9,fontFamily:MO,color:T3}}>{l.source||"—"}</span>
                <span style={{fontSize:9,fontFamily:MO,color:T3}}>{timeAgo(l.created_at)}</span>
                <span style={{fontSize:8,fontFamily:MO,fontWeight:600,padding:"3px 8px",borderRadius:4,textTransform:"uppercase",color:l.converted?GR:l.unsubscribed?RD:l.status==="active"?AH:T3,background:l.converted?"rgba(34,197,94,0.06)":l.status==="active"?"rgba(96,165,250,0.06)":"transparent"}}>{l.converted?"converted":l.unsubscribed?"unsub":l.status||"—"}</span>
              </div>
            ))}
            {!leads.length&&<p style={{fontSize:12,color:T3,textAlign:"center",padding:20}}>No leads captured yet.</p>}
          </div>
        )}

        {/* ═══ HEALTH TAB ═══ */}
        {tab==="health"&&(
          <div style={{...gl,padding:20}}>
            <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".1em",marginBottom:16}}>SYSTEM HEALTH</p>
            {health?.checks?.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(36,48,78,0.12)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.status==="ok"?TL:c.status==="degraded"?OR:RD}}/>
                  <span style={{fontSize:13,fontWeight:600,color:T1,textTransform:"uppercase"}}>{c.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {c.latencyMs!==undefined&&<span style={{fontSize:10,fontFamily:MO,color:T3}}>{c.latencyMs}ms</span>}
                  <span style={{fontSize:10,fontFamily:MO,fontWeight:700,color:c.status==="ok"?TL:c.status==="degraded"?OR:RD}}>{c.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
            {!health&&<p style={{fontSize:12,color:T3,textAlign:"center",padding:20}}>Loading health data...</p>}
          </div>
        )}

        {/* Footer */}
        <div style={{marginTop:16,padding:"10px 14px",borderRadius:10,border:"1px solid "+BD,background:"rgba(11,14,24,0.35)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:14}}>
            <span style={{fontSize:8,color:T3}}>Ghost Tax Inc. | Wilmington, DE</span>
            <span style={{fontSize:8,color:T3}}>Target: US + DACH</span>
          </div>
          <span style={{fontSize:8,fontFamily:MO,color:T3}}>{new Date().toLocaleString("en-US",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</span>
        </div>
      </div>
    </div>
  );
}
