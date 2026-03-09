"use client";
import { useState, useMemo } from "react";

/*  GHOST TAX — PROFIT COMMAND CENTER (ADMIN DASHBOARD)
    Sprint 4. Lists vault_sessions leads sorted by recoverable_annual DESC.
    Mini entropy radar + percentile per lead. ADMIN_TOKEN gate.
    Production: replace MOCK_LEADS with Supabase query.
    100% USD. Zero French. Bloomberg terminal density. */

var V="#060912",A="#3b82f6",AH="#60a5fa",T1="#e0e6f2",T2="#8d9bb5",T3="#55637d",RD="#ef4444",OR="#f59e0b",GR="#22c55e",TL="#34d399",BD="rgba(36,48,78,0.32)",MO="ui-monospace,'Cascadia Code','Fira Code',monospace",SA="system-ui,-apple-system,sans-serif";
var gl={background:"rgba(11,14,24,0.72)",backdropFilter:"blur(18px) saturate(1.15)",WebkitBackdropFilter:"blur(18px) saturate(1.15)",border:"1px solid "+BD,borderRadius:12,boxShadow:"0 4px 32px rgba(0,0,0,0.28)"};
function fmt(n,s){if(s&&n>=1e6)return"$"+(n/1e6).toFixed(1)+"M";if(s&&n>=1e4)return"$"+Math.round(n/1e3)+"k";return"$"+Math.round(n).toLocaleString("en-US");}

// ── Mock leads (production: SELECT * FROM vault_sessions ORDER BY recoverable_annual DESC)
var LEADS=[
  {id:"a1b2c3",email:"cfo@nexusdigital.com",company_name:"Nexus Digital",contact_name:"Sarah Chen",ghost_tax_annual:224000,entropy_score:78,entropy_kappa:0.186,peer_percentile:84,recoverable_annual:134400,headcount:185,industry:"saas_tech",saas_tool_count:74,monthly_spend_total:82000,status:"pending",created_at:"2026-03-05T14:23:00Z",peer_metrics:[{k:"spe",v:443,p:72},{k:"tools",v:0.4,p:35},{k:"util",v:48,p:78},{k:"shadow",v:22,p:76},{k:"ai",v:95,p:82}]},
  {id:"d4e5f6",email:"vp.eng@scaleforce.io",company_name:"ScaleForce",contact_name:"James Park",ghost_tax_annual:198000,entropy_score:71,entropy_kappa:0.158,peer_percentile:79,recoverable_annual:118800,headcount:142,industry:"saas_tech",saas_tool_count:58,monthly_spend_total:68000,status:"contacted",created_at:"2026-03-05T11:47:00Z",peer_metrics:[{k:"spe",v:479,p:76},{k:"tools",v:0.41,p:38},{k:"util",v:52,p:72},{k:"shadow",v:18,p:68},{k:"ai",v:72,p:71}]},
  {id:"g7h8i9",email:"finance@mediqore.com",company_name:"MediQore Health",contact_name:"Lisa Wang",ghost_tax_annual:167000,entropy_score:64,entropy_kappa:0.142,peer_percentile:71,recoverable_annual:100200,headcount:210,industry:"healthcare",saas_tool_count:45,monthly_spend_total:56000,status:"pending",created_at:"2026-03-04T16:02:00Z",peer_metrics:[{k:"spe",v:267,p:48},{k:"tools",v:0.21,p:22},{k:"util",v:55,p:65},{k:"shadow",v:15,p:72},{k:"ai",v:58,p:68}]},
  {id:"j1k2l3",email:"coo@retailpulse.co",company_name:"RetailPulse",contact_name:"Marcus Johnson",ghost_tax_annual:143000,entropy_score:58,entropy_kappa:0.124,peer_percentile:66,recoverable_annual:85800,headcount:120,industry:"retail",saas_tool_count:52,monthly_spend_total:48000,status:"qualified",created_at:"2026-03-04T09:15:00Z",peer_metrics:[{k:"spe",v:400,p:72},{k:"tools",v:0.43,p:42},{k:"util",v:58,p:62},{k:"shadow",v:20,p:70},{k:"ai",v:45,p:55}]},
  {id:"m4n5o6",email:"head.fin@cloudnova.dev",company_name:"CloudNova",contact_name:"Aisha Patel",ghost_tax_annual:312000,entropy_score:86,entropy_kappa:0.221,peer_percentile:91,recoverable_annual:187200,headcount:320,industry:"saas_tech",saas_tool_count:112,monthly_spend_total:124000,status:"pending",created_at:"2026-03-05T16:41:00Z",peer_metrics:[{k:"spe",v:388,p:62},{k:"tools",v:0.35,p:30},{k:"util",v:42,p:84},{k:"shadow",v:28,p:82},{k:"ai",v:140,p:92}]},
  {id:"p7q8r9",email:"ops@finledger.com",company_name:"FinLedger",contact_name:"David Kim",ghost_tax_annual:89000,entropy_score:42,entropy_kappa:0.098,peer_percentile:52,recoverable_annual:53400,headcount:75,industry:"finance",saas_tool_count:28,monthly_spend_total:34000,status:"contacted",created_at:"2026-03-03T13:22:00Z",peer_metrics:[{k:"spe",v:453,p:78},{k:"tools",v:0.37,p:44},{k:"util",v:72,p:38},{k:"shadow",v:6,p:32},{k:"ai",v:28,p:42}]},
];

// ── Status helpers
var STATUS_COL={pending:OR,contacted:AH,qualified:TL,converted:GR,lost:T3};
var STATUS_BG={pending:"rgba(245,158,11,0.06)",contacted:"rgba(96,165,250,0.06)",qualified:"rgba(52,211,153,0.06)",converted:"rgba(34,197,94,0.06)",lost:"rgba(85,99,125,0.06)"};
function scoreCol(s){return s>=61?RD:s>=31?OR:GR;}
function pctCol(p){return p>75?RD:p>50?OR:p>25?GR:TL;}

// ── Mini Radar (48x48, ultra-compact) ──────────────
function MiniRadar(props){
  var metrics=props.metrics||[];
  if(metrics.length<3)return null;
  var cx=24,cy=24,R=20,n=metrics.length,step=360/n;
  function xy(ang,r){var rd=(ang-90)*Math.PI/180;return[cx+r*Math.cos(rd),cy+r*Math.sin(rd)];}
  var pts=metrics.map(function(m,i){var nm=1-m.p/100;var p=xy(i*step,R*Math.max(0.08,nm));return p[0]+","+p[1];}).join(" ");
  var vc={};metrics.forEach(function(m){var v=m.p<=25?"ex":m.p<=50?"gd":m.p<=75?"wn":"cr";vc[m.k]=v;});
  var cols={ex:TL,gd:GR,wn:OR,cr:RD};
  return(
    <svg viewBox="0 0 48 48" width="48" height="48">
      <polygon points={metrics.map(function(_,i){var p=xy(i*step,R);return p[0]+","+p[1];}).join(" ")} fill="none" stroke="rgba(36,48,78,0.25)" strokeWidth="0.5"/>
      <polygon points={metrics.map(function(_,i){var p=xy(i*step,R*0.5);return p[0]+","+p[1];}).join(" ")} fill="none" stroke="rgba(36,48,78,0.15)" strokeWidth="0.3"/>
      <polygon points={pts} fill="rgba(59,130,246,0.12)" stroke={A} strokeWidth="1" strokeLinejoin="round"/>
      {metrics.map(function(m,i){var nm=1-m.p/100;var p=xy(i*step,R*Math.max(0.08,nm));var v=m.p<=25?"ex":m.p<=50?"gd":m.p<=75?"wn":"cr";return <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={cols[v]} stroke={V} strokeWidth="0.8"/>;})}
    </svg>
  );
}

// ── Time ago formatter
function timeAgo(iso){
  var ms=Date.now()-new Date(iso).getTime();
  var min=Math.floor(ms/60000);
  if(min<60)return min+"m ago";
  var hrs=Math.floor(min/60);
  if(hrs<24)return hrs+"h ago";
  return Math.floor(hrs/24)+"d ago";
}

// ── Pipeline summary
function pipelineSummary(leads){
  var counts={pending:0,contacted:0,qualified:0,converted:0,lost:0};
  var totalRecoverable=0;
  leads.forEach(function(l){counts[l.status]=(counts[l.status]||0)+1;totalRecoverable+=l.recoverable_annual;});
  return{counts:counts,totalRecoverable:totalRecoverable,totalLeads:leads.length};
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function AdminDashboard(){
  var[authed,setAuthed]=useState(false);
  var[token,setToken]=useState("");
  var[sortKey,setSortKey]=useState("recoverable_annual");
  var[sortDir,setSortDir]=useState("desc");
  var[filterStatus,setFilterStatus]=useState("all");
  var[expandedId,setExpandedId]=useState(null);

  // Sort leads
  var sorted=useMemo(function(){
    var filtered=filterStatus==="all"?LEADS:LEADS.filter(function(l){return l.status===filterStatus;});
    return filtered.slice().sort(function(a,b){
      var va=a[sortKey]||0;var vb=b[sortKey]||0;
      return sortDir==="desc"?vb-va:va-vb;
    });
  },[sortKey,sortDir,filterStatus]);

  var pipeline=useMemo(function(){return pipelineSummary(LEADS);},[]);

  // ── AUTH GATE ──────────────────────────────────
  if(!authed){
    return(
      <div style={{minHeight:"100vh",background:V,fontFamily:SA,color:T1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={Object.assign({},gl,{padding:28,width:360,textAlign:"center"})}>
          <p style={{fontSize:20,marginBottom:8}}>🔐</p>
          <p style={{fontSize:14,fontWeight:700,marginBottom:4}}>Profit Command Center</p>
          <p style={{fontSize:11,color:T2,marginBottom:16}}>Enter your admin token to access the lead pipeline.</p>
          <input
            type="password"
            value={token}
            onChange={function(e){setToken(e.target.value);}}
            style={{width:"100%",padding:"10px 12px",borderRadius:7,border:"1px solid #1e2640",background:"#080b14",color:T1,fontSize:13,fontFamily:MO,outline:"none",boxSizing:"border-box",marginBottom:12,textAlign:"center"}}
            onFocus={function(e){e.target.style.borderColor=A;}}
            onBlur={function(e){e.target.style.borderColor="#1e2640";}}
            onKeyDown={function(e){if(e.key==="Enter"&&token.length>3)setAuthed(true);}}
          />
          <button
            onClick={function(){if(token.length>3)setAuthed(true);}}
            style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:token.length>3?A:"#131828",color:token.length>3?"#fff":T3,fontSize:12,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",cursor:token.length>3?"pointer":"not-allowed"}}
          >
            AUTHENTICATE
          </button>
          <p style={{fontSize:8,color:T3,marginTop:10}}>Production: validated against ADMIN_TOKEN env var server-side.</p>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:V,fontFamily:SA,color:T1,padding:"16px"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontFamily:MO,fontWeight:700,letterSpacing:".06em",color:A}}>GHOST TAX</span>
            <span style={{fontSize:8,fontFamily:MO,color:T3,padding:"2px 6px",borderRadius:3,border:"1px solid "+BD}}>COMMAND CENTER</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:9,fontFamily:MO,color:TL}}>● LIVE</span>
            <button onClick={function(){setAuthed(false);setToken("");}} style={{fontSize:9,color:T3,background:"none",border:"1px solid "+BD,borderRadius:5,padding:"4px 10px",cursor:"pointer"}}>LOGOUT</button>
          </div>
        </div>

        {/* Pipeline KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:16}}>
          {[
            {l:"Total Leads",v:pipeline.totalLeads,c:T1},
            {l:"Pipeline Value",v:fmt(pipeline.totalRecoverable,true)+"/yr",c:TL},
            {l:"Pending",v:pipeline.counts.pending,c:OR},
            {l:"Contacted",v:pipeline.counts.contacted,c:AH},
            {l:"Qualified",v:pipeline.counts.qualified,c:TL},
            {l:"Converted",v:pipeline.counts.converted,c:GR},
          ].map(function(kpi){
            return(
              <div key={kpi.l} style={Object.assign({},gl,{padding:12,textAlign:"center"})}>
                <p style={{fontSize:7.5,color:T3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{kpi.l}</p>
                <p style={{fontFamily:MO,fontSize:18,fontWeight:800,color:kpi.c}}>{kpi.v}</p>
              </div>
            );
          })}
        </div>

        {/* Filters + Sort */}
        <div style={Object.assign({},gl,{padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8})}>
          <div style={{display:"flex",gap:3}}>
            {["all","pending","contacted","qualified","converted","lost"].map(function(s){
              var active=filterStatus===s;
              return(
                <button key={s} onClick={function(){setFilterStatus(s);}}
                  style={{padding:"4px 10px",borderRadius:5,border:"none",fontSize:9,fontFamily:MO,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",background:active?A:"rgba(0,0,0,0.12)",color:active?"#fff":T3,cursor:"pointer"}}
                >{s}</button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:8,color:T3,fontFamily:MO}}>SORT:</span>
            {[["recoverable_annual","$ Value"],["entropy_score","Entropy"],["peer_percentile","Peer P"],["created_at","Newest"]].map(function(opt){
              var active=sortKey===opt[0];
              return(
                <button key={opt[0]} onClick={function(){if(sortKey===opt[0]){setSortDir(sortDir==="desc"?"asc":"desc");}else{setSortKey(opt[0]);setSortDir("desc");}}}
                  style={{padding:"3px 8px",borderRadius:4,border:"none",fontSize:8,fontFamily:MO,fontWeight:active?700:500,background:active?"rgba(59,130,246,0.10)":"transparent",color:active?AH:T3,cursor:"pointer"}}
                >{opt[1]} {active?(sortDir==="desc"?"↓":"↑"):""}</button>
              );
            })}
          </div>
        </div>

        {/* Lead Table */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {/* Header row */}
          <div style={{display:"grid",gridTemplateColumns:"36px 48px 1.4fr 1fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr 80px",gap:8,padding:"6px 12px",fontSize:8,fontFamily:MO,color:T3,textTransform:"uppercase",letterSpacing:".06em"}}>
            <span>#</span><span>Radar</span><span>Company / Contact</span><span>Email</span><span>Ghost Tax</span><span>Recoverable</span><span>Score</span><span>Peer</span><span>Time</span><span>Status</span>
          </div>

          {sorted.map(function(lead,idx){
            var expanded=expandedId===lead.id;
            var sc=scoreCol(lead.entropy_score);
            var pc=pctCol(lead.peer_percentile);
            var stCol=STATUS_COL[lead.status]||T3;
            var stBg=STATUS_BG[lead.status]||"transparent";

            return(
              <div key={lead.id}>
                {/* Main row */}
                <div
                  onClick={function(){setExpandedId(expanded?null:lead.id);}}
                  style={Object.assign({},gl,{padding:"10px 12px",cursor:"pointer",borderColor:expanded?A+"30":BD,transition:"border-color 0.15s",display:"grid",gridTemplateColumns:"36px 48px 1.4fr 1fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr 80px",gap:8,alignItems:"center"})}
                >
                  <span style={{fontFamily:MO,fontSize:11,fontWeight:700,color:T3}}>{idx+1}</span>
                  <MiniRadar metrics={lead.peer_metrics}/>
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:T1,marginBottom:1}}>{lead.company_name}</p>
                    <p style={{fontSize:9,color:T3}}>{lead.contact_name} · {lead.industry}</p>
                  </div>
                  <span style={{fontSize:10,color:T2,fontFamily:MO,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.email}</span>
                  <span style={{fontFamily:MO,fontSize:12,fontWeight:700,color:sc}}>{fmt(lead.ghost_tax_annual,true)}</span>
                  <span style={{fontFamily:MO,fontSize:12,fontWeight:800,color:TL}}>{fmt(lead.recoverable_annual,true)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontFamily:MO,fontSize:12,fontWeight:700,color:sc}}>{lead.entropy_score}</span>
                    <span style={{fontSize:8,color:T3}}>/100</span>
                  </div>
                  <span style={{fontFamily:MO,fontSize:12,fontWeight:700,color:pc}}>P{lead.peer_percentile}</span>
                  <span style={{fontSize:9,color:T3,fontFamily:MO}}>{timeAgo(lead.created_at)}</span>
                  <span style={{fontSize:8,fontFamily:MO,fontWeight:600,padding:"3px 8px",borderRadius:4,textTransform:"uppercase",letterSpacing:".04em",textAlign:"center",color:stCol,background:stBg,border:"1px solid "+stCol+"20"}}>{lead.status}</span>
                </div>

                {/* Expanded detail panel */}
                {expanded&&(
                  <div style={Object.assign({},gl,{padding:16,marginTop:4,borderColor:A+"25"})}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                      {/* Left: company details */}
                      <div>
                        <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>COMPANY PROFILE</p>
                        {[
                          ["Headcount",lead.headcount],
                          ["SaaS Tools",lead.saas_tool_count],
                          ["Monthly IT",fmt(lead.monthly_spend_total)],
                          ["Industry",lead.industry],
                          ["Contact",lead.contact_name],
                          ["Email",lead.email],
                        ].map(function(row){
                          return(
                            <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(36,48,78,0.10)",fontSize:11}}>
                              <span style={{color:T3}}>{row[0]}</span>
                              <span style={{color:T1,fontFamily:MO,fontWeight:500}}>{row[1]}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Center: peer metrics */}
                      <div>
                        <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>PEER METRICS (P={lead.peer_percentile})</p>
                        {(lead.peer_metrics||[]).map(function(m){
                          var pc2=pctCol(m.p);
                          var names={spe:"Spend/Employee",tools:"SaaS/Employee",util:"License Util",shadow:"Shadow IT",ai:"AI Growth"};
                          var w=Math.max(3,Math.min(97,m.p));
                          return(
                            <div key={m.k} style={{marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                                <span style={{color:T2}}>{names[m.k]||m.k}</span>
                                <span style={{fontFamily:MO,fontWeight:700,color:pc2}}>P{m.p}</span>
                              </div>
                              <div style={{height:3,borderRadius:2,background:"rgba(0,0,0,0.2)",overflow:"hidden"}}>
                                <div style={{height:"100%",width:w+"%",borderRadius:2,background:"linear-gradient(90deg,"+TL+","+pc2+")",transition:"width 0.5s"}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right: diagnostics + actions */}
                      <div>
                        <p style={{fontSize:8,fontFamily:MO,color:T3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>GHOST TAX DIAGNOSTIC</p>
                        {[
                          ["Annual Ghost Tax",fmt(lead.ghost_tax_annual),sc],
                          ["Recoverable (60%)",fmt(lead.recoverable_annual),TL],
                          ["Entropy Score",lead.entropy_score+"/100",sc],
                          ["Entropy κ",lead.entropy_kappa.toFixed(3),lead.entropy_kappa>0.2?OR:AH],
                          ["Peer Percentile","P"+lead.peer_percentile,pc],
                        ].map(function(row){
                          return(
                            <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(36,48,78,0.10)",fontSize:11}}>
                              <span style={{color:T3}}>{row[0]}</span>
                              <span style={{fontFamily:MO,fontWeight:700,color:row[2]}}>{row[1]}</span>
                            </div>
                          );
                        })}
                        <div style={{display:"flex",gap:6,marginTop:12}}>
                          {[["contacted","Mark Contacted",AH],["qualified","Qualify",TL],["lost","Mark Lost",T3]].map(function(action){
                            return(
                              <button key={action[0]} style={{flex:1,padding:"6px 8px",borderRadius:5,border:"none",fontSize:8,fontFamily:MO,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",background:action[2]+"15",color:action[2],cursor:"pointer",border:"1px solid "+action[2]+"25"}}>{action[1]}</button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {sorted.length===0&&(
          <div style={Object.assign({},gl,{padding:32,textAlign:"center"})}>
            <p style={{fontSize:14,color:T2}}>No leads match the current filter.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{marginTop:16,padding:"10px 14px",borderRadius:10,border:"1px solid "+BD,background:"rgba(11,14,24,0.35)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:14}}>
            {[{i:"🛡",t:"SOC2 Ready"},{i:"🔐",t:"Zero-Knowledge"},{i:"🇺🇸",t:"US Hosted"}].map(function(b){return(<span key={b.t} style={{display:"flex",alignItems:"center",gap:4,fontSize:8,color:T3}}><span style={{fontSize:11}}>{b.i}</span>{b.t}</span>);})}
          </div>
          <span style={{fontSize:8,fontFamily:MO,color:T3}}>ADMIN SESSION · {new Date().toLocaleString("en-US",{hour:"2-digit",minute:"2-digit"})} EST</span>
        </div>

      </div>
    </div>
  );
}
