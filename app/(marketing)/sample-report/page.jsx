"use client";
import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

/*  VALUGUARD — SAMPLE REPORT (US 2026)
    Interactive demo of what the client gets after an audit.
    Pre-filled with realistic data for "Nexus Digital" (fake company).
    100% USD. Self-contained. i18n via useI18n(). */

var V="#060912",A="#3b82f6",AH="#60a5fa",T1="#e0e6f2",T2="#8d9bb5",T3="#55637d",RD="#ef4444",OR="#f59e0b",GR="#22c55e",TL="#34d399",BD="rgba(36,48,78,0.32)",MO="ui-monospace,'Cascadia Code','Fira Code',monospace",SA="system-ui,-apple-system,sans-serif";
var gl={background:"rgba(11,14,24,0.72)",backdropFilter:"blur(18px) saturate(1.15)",WebkitBackdropFilter:"blur(18px) saturate(1.15)",border:"1px solid "+BD,borderRadius:12,boxShadow:"0 4px 32px rgba(0,0,0,0.28)"};

function fmt(n,s){if(s&&n>=1e6)return"$"+(n/1e6).toFixed(1)+"M";if(s&&n>=1e4)return"$"+Math.round(n/1e3)+"k";return"$"+Math.round(n).toLocaleString("en-US");}

var COMPANY = {
  name: "Nexus Digital",
  industry: "SaaS / Tech",
  headcount: 185,
  tools: 74,
  monthlyIT: 82000,
  period: "Jan 1 – Mar 31, 2026",
};

var SCORE = {
  health: 31,
  ghostTax: 224000,
  ghostTaxMo: 18667,
  leakPct: 22.8,
  kappa: 0.158,
  peerPct: 82,
};

var ANOMALY_DEFS = [
  { id: 1, titleKey: "sample.a1.title", sev: "critical", vendor: "Slack", typeKey: "sample.type.inactive", impactMo: 3100, impactYr: 37200 },
  { id: 2, titleKey: "sample.a2.title", sev: "critical", vendor: "OpenAI", typeKey: "sample.type.aidrift", impactMo: 4200, impactYr: 50400 },
  { id: 3, titleKey: "sample.a3.title", sev: "critical", vendor: "ChatGPT + Jasper + Copy.ai", typeKey: "sample.type.redundant", impactMo: 1800, impactYr: 21600 },
  { id: 4, titleKey: "sample.a4.title", sev: "high", vendor: "Salesforce", typeKey: "sample.type.oversized", impactMo: 1500, impactYr: 18000 },
  { id: 5, titleKey: "sample.a5.title", sev: "high", vendor: "AWS", typeKey: "sample.type.commitment", impactMo: 2800, impactYr: 33600 },
  { id: 6, titleKey: "sample.a6.title", sev: "high", vendor: "Figma", typeKey: "sample.type.oversized", impactMo: 960, impactYr: 11520 },
  { id: 7, titleKey: "sample.a7.title", sev: "medium", vendor: "Notion", typeKey: "sample.type.shadow", impactMo: 680, impactYr: 8160 },
  { id: 8, titleKey: "sample.a8.title", sev: "medium", vendor: "Datadog", typeKey: "sample.type.unused", impactMo: 1200, impactYr: 14400 },
  { id: 9, titleKey: "sample.a9.title", sev: "medium", vendor: "HubSpot", typeKey: "sample.type.contract", impactMo: 540, impactYr: 6480 },
  { id: 10, titleKey: "sample.a10.title", sev: "low", vendor: "Vercel", typeKey: "sample.type.orphan", impactMo: 320, impactYr: 3840 },
];

var REC_DEFS = [
  { rank: 1, titleKey: "sample.r1.title", savings: 37200, effortKey: "sample.effort.easy", days: 2, related: [1] },
  { rank: 2, titleKey: "sample.r2.title", savings: 25200, effortKey: "sample.effort.easy", days: 3, related: [2] },
  { rank: 3, titleKey: "sample.r3.title", savings: 21600, effortKey: "sample.effort.moderate", days: 14, related: [3] },
  { rank: 4, titleKey: "sample.r4.title", savings: 16800, effortKey: "sample.effort.moderate", days: 30, related: [5] },
  { rank: 5, titleKey: "sample.r5.title", savings: 18000, effortKey: "sample.effort.easy", days: 5, related: [4] },
];

var CAT_DEFS = [
  { nameKey: "sample.cat.saas", spend: 42000, leak: 9200, pct: 21.9 },
  { nameKey: "sample.cat.cloud", spend: 24000, leak: 4600, pct: 19.2 },
  { nameKey: "sample.cat.ai", spend: 16000, leak: 4867, pct: 30.4 },
];

var sevCol={critical:RD,high:OR,medium:"#d4a72c",low:GR};
var sevBg={critical:"rgba(239,68,68,0.06)",high:"rgba(245,158,11,0.06)",medium:"rgba(212,167,44,0.06)",low:"rgba(34,197,94,0.06)"};

function Gauge(props){
  var s=props.score;var label=props.label;var t=props.t;var R=44,ci=2*Math.PI*R,off=ci-(s/100)*ci;
  var col=s>=61?RD:s>=31?OR:GR;
  var lab=s>=61?t("sample.sev.critical"):s>=31?t("sample.sev.elevated"):t("sample.sev.healthy");
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width="130" height="130" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#161c2c" strokeWidth="7"/>
        <circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{transition:"stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"}}/>
        <text x="60" y="54" textAnchor="middle" fill={col} style={{fontSize:28,fontFamily:MO,fontWeight:800}}>{s}</text>
        <text x="60" y="72" textAnchor="middle" fill={T3} style={{fontSize:8,letterSpacing:".12em",fontWeight:600}}>{lab}</text>
      </svg>
      <span style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:T3,marginTop:2}}>{label}</span>
    </div>
  );
}

function genSummaryText(){
  var lines=[];
  lines.push("VALUGUARD — SAMPLE AUDIT REPORT");
  lines.push("Company: "+COMPANY.name+" | Period: "+COMPANY.period);
  lines.push("Headcount: "+COMPANY.headcount+" | SaaS Tools: "+COMPANY.tools+" | Monthly IT: "+fmt(COMPANY.monthlyIT));
  lines.push("");
  lines.push("GHOST TAX: "+fmt(SCORE.ghostTax)+"/yr ("+SCORE.leakPct+"% of spend)");
  lines.push("Health Score: "+SCORE.health+"/100 | Entropy: "+SCORE.kappa+" | Peer: P"+SCORE.peerPct);
  lines.push("");
  lines.push("TOP ANOMALIES:");
  ANOMALIES.slice(0,5).forEach(function(a,i){lines.push("  "+(i+1)+". "+a.title+" — "+fmt(a.impactYr)+"/yr ("+a.sev+")");});
  lines.push("");
  lines.push("TOP RECOVERY ACTIONS:");
  RECS.forEach(function(r){lines.push("  #"+r.rank+" "+r.title+" — "+fmt(r.savings,true)+"/yr | "+r.effort+" | ~"+r.days+" days");});
  lines.push("");
  lines.push("DISCLAIMER: This is a SAMPLE report with fictional data.");
  lines.push("Your actual audit will analyze YOUR billing data.");
  lines.push("valuguard.com | SOC2 Type II Ready | Zero-Knowledge Audit");
  return lines.join("\n");
}

export default function SampleReport(){
  var { t, formatCurrency: fc } = useI18n();
  var st=useState("overview");var tab=st[0];var setTab=st[1];

  var ANOMALIES=ANOMALY_DEFS.map(function(a){return Object.assign({},a,{title:t(a.titleKey),type:t(a.typeKey)});});
  var RECS=REC_DEFS.map(function(r){return Object.assign({},r,{title:t(r.titleKey),effort:t(r.effortKey)});});
  var CATEGORIES=CAT_DEFS.map(function(c){return Object.assign({},c,{name:t(c.nameKey)});});

  var totalRecoverable=RECS.reduce(function(s,r){return s+r.savings;},0);

  var tabs=[
    ["overview",t("sample.tab.overview")],
    ["anomalies",t("sample.tab.anomalies")+" ("+ANOMALIES.length+")"],
    ["actions",t("sample.tab.actions")],
    ["export",t("sample.tab.export")]
  ];

  return(
    <div style={{minHeight:"100vh",background:V,fontFamily:SA,color:T1,padding:"20px 14px 48px"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>

        {/* RETOUR */}
        <div style={{marginBottom:14}}><a href="/" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:T2,textDecoration:"none",padding:"6px 12px",borderRadius:6,border:"1px solid "+BD,background:"rgba(11,14,24,0.5)"}}>{t("back")}</a></div>

        {/* WATERMARK */}
        <div style={{textAlign:"center",padding:"10px",marginBottom:16,borderRadius:8,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.18)"}}>
          <p style={{fontSize:10,fontFamily:MO,fontWeight:600,color:OR,letterSpacing:".08em"}}>{t("sample.watermark")}</p>
        </div>

        {/* HEADER */}
        <div style={Object.assign({},gl,{padding:20,marginBottom:14})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <p style={{fontSize:11,fontFamily:MO,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:A,marginBottom:8}}>{t("sample.header")}</p>
              <h1 style={{fontSize:28,fontWeight:800,marginBottom:6}}>{COMPANY.name}</h1>
              <p style={{fontSize:14,color:T2}}>{COMPANY.industry} · {COMPANY.headcount} employees · {COMPANY.tools} SaaS tools</p>
              <p style={{fontSize:12,color:T3,marginTop:4}}>Audit period: {COMPANY.period}</p>
            </div>
            <div style={{textAlign:"right"}}>
              <Gauge score={SCORE.health} label={t("sample.healthscore")} t={t}/>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={Object.assign({},gl,{padding:"5px",marginBottom:14,display:"flex",gap:3})}>
          {tabs.map(function(tb){
            var active=tab===tb[0];
            return(<button key={tb[0]} onClick={function(){setTab(tb[0]);}} style={{flex:1,padding:"12px 16px",borderRadius:8,border:"none",fontSize:14,fontWeight:700,fontFamily:MO,letterSpacing:".03em",background:active?A:"transparent",color:active?"#fff":T2,cursor:"pointer",transition:"all 0.12s"}}>{tb[1]}</button>);
          })}
        </div>

        {/* OVERVIEW TAB */}
        {tab==="overview"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[
              {l:t("sample.kpi.ghosttax"),v:fc(SCORE.ghostTax,true),c:RD,s:SCORE.leakPct+"% "+t("sample.kpi.ofspend")},
              {l:t("sample.kpi.monthly"),v:fc(SCORE.ghostTaxMo),c:OR,s:fc(COMPANY.monthlyIT)+"/mo "+t("sample.kpi.total")},
              {l:t("sample.kpi.entropy"),v:SCORE.kappa.toFixed(3),c:SCORE.kappa>0.15?OR:AH,s:t("sample.kpi.drag")},
              {l:t("sample.kpi.peer"),v:"P"+SCORE.peerPct,c:RD,s:t("sample.kpi.vspeer")},
            ].map(function(k){return(
              <div key={k.l} style={Object.assign({},gl,{padding:18,textAlign:"center"})}>
                <p style={{fontSize:11,fontWeight:700,color:T3,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>{k.l}</p>
                <p style={{fontFamily:MO,fontSize:36,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</p>
                <p style={{fontSize:12,color:T3,marginTop:6,fontWeight:500}}>{k.s}</p>
              </div>
            );})}
          </div>

          {/* Category Breakdown */}
          <div style={Object.assign({},gl,{padding:20})}>
            <p style={{fontSize:12,fontFamily:MO,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",color:A,marginBottom:16}}>{t("sample.breakdown")}</p>
            {CATEGORIES.map(function(cat){
              var w=cat.leak>0?(cat.leak/cat.spend)*100:0;
              return(
                <div key={cat.name} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                    <span style={{fontSize:16,fontWeight:600,color:T1}}>{cat.name}</span>
                    <div style={{display:"flex",gap:14,alignItems:"baseline"}}>
                      <span style={{fontSize:13,color:T3}}>{t("sample.spend")}: <span style={{fontFamily:MO,color:T2}}>{fc(cat.spend)}/mo</span></span>
                      <span style={{fontFamily:MO,fontSize:15,fontWeight:700,color:RD}}>{t("sample.leak")}: {fc(cat.leak)}/mo ({cat.pct}%)</span>
                    </div>
                  </div>
                  <div style={{height:6,borderRadius:3,background:"#121728",overflow:"hidden",position:"relative"}}>
                    <div style={{height:"100%",width:"100%",borderRadius:3,background:"rgba(59,130,246,0.15)"}}/>
                    <div style={{position:"absolute",right:0,top:0,height:"100%",width:w+"%",borderRadius:"0 3px 3px 0",background:"linear-gradient(90deg,"+OR+","+RD+")"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Executive Summary */}
          <div style={Object.assign({},gl,{padding:16})}>
            <p style={{fontSize:12,fontFamily:MO,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:A,marginBottom:10}}>{t("sample.executive")}</p>
            <p style={{fontSize:15,color:T2,lineHeight:1.7}}>
              {t("sample.exec.p1")} <strong style={{color:T1}}>{fc(COMPANY.monthlyIT)}/{t("sample.mo")}</strong> {t("sample.exec.p2")} {COMPANY.tools} {t("sample.exec.p3")}
              {t("sample.exec.p4")} <strong style={{color:RD}}>{fc(SCORE.ghostTax)}/{t("sample.yr")}</strong> {t("sample.exec.p5")} ({SCORE.leakPct}% {t("sample.kpi.ofspend")}).
              {t("sample.exec.p6")} κ={SCORE.kappa} {t("sample.exec.p7")} P{SCORE.peerPct}.
              {t("sample.exec.p8")} <strong style={{color:TL}}>{fc(totalRecoverable,true)}/{t("sample.yr")}</strong> {t("sample.exec.p9")}
            </p>
          </div>
        </div>)}

        {/* ANOMALIES TAB */}
        {tab==="anomalies"&&(<div style={Object.assign({},gl,{padding:16})}>
          <p style={{fontSize:16,fontWeight:700,marginBottom:14}}>{ANOMALIES.length} {t("sample.anomalies.detected")} {COMPANY.tools} {t("sample.anomalies.tools")}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ANOMALIES.map(function(a){return(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:8,background:sevBg[a.sev],border:"1px solid "+sevCol[a.sev]+"14"}}>
                <span style={{fontSize:10,fontFamily:MO,fontWeight:700,padding:"4px 10px",borderRadius:5,background:sevCol[a.sev]+"18",border:"1px solid "+sevCol[a.sev]+"30",color:sevCol[a.sev],textTransform:"uppercase",letterSpacing:".04em",flexShrink:0}}>{a.sev}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:T1,marginBottom:3}}>{a.title}</p>
                  <p style={{fontSize:12,color:T3}}>{a.vendor} · {a.type}</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{fontFamily:MO,fontSize:18,fontWeight:800,color:sevCol[a.sev]}}>{fc(a.impactMo)}<span style={{fontSize:11}}>/{t("sample.mo")}</span></p>
                  <p style={{fontSize:10,color:T3}}>{fc(a.impactYr)}/{t("sample.yr")}</p>
                </div>
              </div>
            );})}
          </div>
        </div>)}

        {/* ACTIONS TAB */}
        {tab==="actions"&&(<div style={Object.assign({},gl,{padding:16})}>
          <p style={{fontSize:11,fontFamily:MO,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:A,marginBottom:8}}>{t("sample.recovery.label")}</p>
          <p style={{fontSize:18,fontWeight:700,marginBottom:16}}>{RECS.length} {t("sample.recovery.actions")}. {fc(totalRecoverable,true)} {t("sample.recovery.recoverable")}.</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {RECS.map(function(r){
              var efCol=r.effortKey==="sample.effort.easy"?TL:OR;
              return(
                <div key={r.rank} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:8,background:"rgba(0,0,0,0.12)",border:"1px solid rgba(36,48,78,0.14)"}}>
                  <div style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.18)",fontFamily:MO,fontSize:16,fontWeight:800,color:A,flexShrink:0}}>{r.rank}</div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:15,fontWeight:600,color:T1,marginBottom:4}}>{r.title}</p>
                    <div style={{display:"flex",gap:8}}>
                      <span style={{fontSize:10,fontFamily:MO,padding:"3px 8px",borderRadius:4,background:efCol+"12",border:"1px solid "+efCol+"22",color:efCol}}>{r.effort}</span>
                      <span style={{fontSize:11,color:T3}}>~{r.days} {t("sample.days")}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontFamily:MO,fontSize:20,fontWeight:800,color:TL}}>{fc(r.savings,true)}</p>
                    <p style={{fontSize:10,color:T3}}>{t("sample.recovery.peryear")}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:14,padding:"10px 14px",borderRadius:7,background:"rgba(52,211,153,0.04)",border:"1px solid rgba(52,211,153,0.12)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:14,fontWeight:600,color:T2}}>{t("sample.recovery.total")}</span>
            <span style={{fontFamily:MO,fontSize:22,fontWeight:800,color:TL}}>{fc(totalRecoverable)}/{t("sample.yr")}</span>
          </div>
        </div>)}

        {/* EXPORT TAB */}
        {tab==="export"&&(<div style={Object.assign({},gl,{padding:18})}>
          <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:A,marginBottom:8}}>{t("sample.export.label")}</p>
          <p style={{fontSize:14,fontWeight:700,marginBottom:14}}>{t("sample.export.title")}</p>
          <pre style={{fontFamily:MO,fontSize:9,lineHeight:1.6,color:T2,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"rgba(0,0,0,0.2)",padding:14,borderRadius:8,border:"1px solid rgba(36,48,78,0.18)",maxHeight:300,overflow:"auto",marginBottom:14}}>
            {genSummaryText()}
          </pre>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>
            <button onClick={function(){var b=new Blob([genSummaryText()],{type:"text/plain"});var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download="valuguard-sample-report.txt";a.click();URL.revokeObjectURL(u);}} style={{padding:"11px 22px",borderRadius:8,border:"none",background:A,color:"#fff",fontSize:11,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase",cursor:"pointer"}}>
              {t("sample.export.download")}
            </button>
            <button onClick={function(){if(navigator.clipboard)navigator.clipboard.writeText(genSummaryText());}} style={{padding:"11px 18px",borderRadius:8,border:"1px solid "+BD,background:"transparent",color:T2,fontSize:11,cursor:"pointer"}}>
              {t("sample.export.copy")}
            </button>
          </div>
        </div>)}

        {/* BOTTOM CTA */}
        <div style={Object.assign({},gl,{padding:22,marginTop:14,textAlign:"center"})}>
          <p style={{fontSize:20,fontWeight:700,marginBottom:8}}>{t("sample.cta.title1")} <span style={{color:TL}}>{t("sample.cta.title2")}</span></p>
          <p style={{fontSize:14,color:T2,marginBottom:16,lineHeight:1.5,maxWidth:400,margin:"0 auto 16px"}}>
            {t("sample.cta.sub")}
          </p>
          <a href="/estimator" style={{display:"inline-block",padding:"13px 26px",borderRadius:8,background:TL,color:V,fontSize:12,fontWeight:800,letterSpacing:".05em",textTransform:"uppercase",textDecoration:"none"}}>
            {t("sample.cta")}
          </a>
        </div>

        {/* TRUST FOOTER */}
        <div style={{marginTop:16,padding:"11px 14px",borderRadius:10,border:"1px solid "+BD,background:"rgba(11,14,24,0.35)",display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          {[{i:"\u{1F6E1}",k:"trustfooter.soc2"},{i:"\u{1F510}",k:"trustfooter.zk"},{i:"\u{1F1FA}\u{1F1F8}",k:"trustfooter.us"},{i:"\u23F1",k:"trustfooter.purge"}].map(function(b){return(<div key={b.k} style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:T2}}><span style={{fontSize:13}}>{b.i}</span><span style={{fontWeight:600}}>{t(b.k)}</span></div>);})}
        </div>

      </div>
    </div>
  );
}
