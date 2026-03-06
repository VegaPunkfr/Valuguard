"use client";
import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

/*  VALUGUARD — SAMPLE REPORT (US 2026)
    Interactive demo of what the client gets after an audit.
    Pre-filled with realistic data for "Nexus Digital" (fake company).
    100% USD. Zero French. Self-contained. */

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

var ANOMALIES = [
  { id: 1, title: "31 inactive Slack licenses", sev: "critical", vendor: "Slack", type: "Inactive License", impactMo: 3100, impactYr: 37200 },
  { id: 2, title: "OpenAI API spend +140% MoM", sev: "critical", vendor: "OpenAI", type: "AI Cost Drift", impactMo: 4200, impactYr: 50400 },
  { id: 3, title: "3 overlapping AI writing tools", sev: "critical", vendor: "ChatGPT + Jasper + Copy.ai", type: "Redundant Tool", impactMo: 1800, impactYr: 21600 },
  { id: 4, title: "Salesforce Enterprise for 15 basic users", sev: "high", vendor: "Salesforce", type: "Oversized Plan", impactMo: 1500, impactYr: 18000 },
  { id: 5, title: "AWS annual commitment at 52% utilization", sev: "high", vendor: "AWS", type: "Commitment Waste", impactMo: 2800, impactYr: 33600 },
  { id: 6, title: "Figma Enterprise for 8 occasional users", sev: "high", vendor: "Figma", type: "Oversized Plan", impactMo: 960, impactYr: 11520 },
  { id: 7, title: "Notion purchased outside IT procurement", sev: "medium", vendor: "Notion", type: "Shadow IT", impactMo: 680, impactYr: 8160 },
  { id: 8, title: "Datadog APM module never activated", sev: "medium", vendor: "Datadog", type: "Unused Module", impactMo: 1200, impactYr: 14400 },
  { id: 9, title: "HubSpot auto-renewed at +18% rate", sev: "medium", vendor: "HubSpot", type: "Contract Drift", impactMo: 540, impactYr: 6480 },
  { id: 10, title: "Vercel Pro for archived staging projects", sev: "low", vendor: "Vercel", type: "Orphan Resource", impactMo: 320, impactYr: 3840 },
];

var RECS = [
  { rank: 1, title: "Deactivate 31 idle Slack licenses", savings: 37200, effort: "Easy", days: 2, related: [1] },
  { rank: 2, title: "Implement OpenAI budget caps + alerts", savings: 25200, effort: "Easy", days: 3, related: [2] },
  { rank: 3, title: "Consolidate to single AI writing tool", savings: 21600, effort: "Moderate", days: 14, related: [3] },
  { rank: 4, title: "Right-size AWS commitment at renewal", savings: 16800, effort: "Moderate", days: 30, related: [5] },
  { rank: 5, title: "Downgrade Salesforce to Professional", savings: 18000, effort: "Easy", days: 5, related: [4] },
];

var CATEGORIES = [
  { name: "SaaS Licenses", spend: 42000, leak: 9200, pct: 21.9 },
  { name: "Cloud / Infra", spend: 24000, leak: 4600, pct: 19.2 },
  { name: "AI / API", spend: 16000, leak: 4867, pct: 30.4 },
];

var sevCol={critical:RD,high:OR,medium:"#d4a72c",low:GR};
var sevBg={critical:"rgba(239,68,68,0.06)",high:"rgba(245,158,11,0.06)",medium:"rgba(212,167,44,0.06)",low:"rgba(34,197,94,0.06)"};

function Gauge(props){
  var s=props.score;var R=44,ci=2*Math.PI*R,off=ci-(s/100)*ci;
  var col=s>=61?RD:s>=31?OR:GR;
  var lab=s>=61?"CRITICAL":s>=31?"ELEVATED":"HEALTHY";
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width="130" height="130" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#161c2c" strokeWidth="7"/>
        <circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{transition:"stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"}}/>
        <text x="60" y="54" textAnchor="middle" fill={col} style={{fontSize:28,fontFamily:MO,fontWeight:800}}>{s}</text>
        <text x="60" y="72" textAnchor="middle" fill={T3} style={{fontSize:8,letterSpacing:".12em",fontWeight:600}}>{lab}</text>
      </svg>
      <span style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:T3,marginTop:2}}>Health Score</span>
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
  var { t } = useI18n();
  var st=useState("overview");var tab=st[0];var setTab=st[1];

  var totalRecoverable=RECS.reduce(function(s,r){return s+r.savings;},0);

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
              <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:A,marginBottom:6}}>GHOST TAX AUDIT REPORT</p>
              <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>{COMPANY.name}</h1>
              <p style={{fontSize:11,color:T2}}>{COMPANY.industry} · {COMPANY.headcount} employees · {COMPANY.tools} SaaS tools</p>
              <p style={{fontSize:10,color:T3,marginTop:2}}>Audit period: {COMPANY.period}</p>
            </div>
            <div style={{textAlign:"right"}}>
              <Gauge score={SCORE.health}/>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={Object.assign({},gl,{padding:"4px",marginBottom:14,display:"flex",gap:2})}>
          {[["overview","Overview"],["anomalies","Anomalies ("+ANOMALIES.length+")"],["actions","Recovery Plan"],["export","Export"]].map(function(t){
            var active=tab===t[0];
            return(<button key={t[0]} onClick={function(){setTab(t[0]);}} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",fontSize:10,fontWeight:600,fontFamily:MO,letterSpacing:".03em",background:active?A:"transparent",color:active?"#fff":T2,cursor:"pointer",transition:"all 0.12s"}}>{t[1]}</button>);
          })}
        </div>

        {/* OVERVIEW TAB */}
        {tab==="overview"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[
              {l:"Annual Ghost Tax",v:fmt(SCORE.ghostTax,true),c:RD,s:SCORE.leakPct+"% of spend"},
              {l:"Monthly Leak",v:fmt(SCORE.ghostTaxMo),c:OR,s:fmt(COMPANY.monthlyIT)+"/mo total"},
              {l:"Entropy κ",v:SCORE.kappa.toFixed(3),c:SCORE.kappa>0.15?OR:AH,s:"Organizational drag"},
              {l:"Peer Position",v:"P"+SCORE.peerPct,c:RD,s:"vs SaaS scale-ups"},
            ].map(function(k){return(
              <div key={k.l} style={Object.assign({},gl,{padding:14,textAlign:"center"})}>
                <p style={{fontSize:8,color:T3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{k.l}</p>
                <p style={{fontFamily:MO,fontSize:22,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</p>
                <p style={{fontSize:8,color:T3,marginTop:4}}>{k.s}</p>
              </div>
            );})}
          </div>

          {/* Category Breakdown */}
          <div style={Object.assign({},gl,{padding:16})}>
            <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T3,marginBottom:12}}>SPEND BREAKDOWN BY CATEGORY</p>
            {CATEGORIES.map(function(cat){
              var w=cat.leak>0?(cat.leak/cat.spend)*100:0;
              return(
                <div key={cat.name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:600,color:T1}}>{cat.name}</span>
                    <div style={{display:"flex",gap:12,alignItems:"baseline"}}>
                      <span style={{fontSize:10,color:T3}}>Spend: <span style={{fontFamily:MO,color:T2}}>{fmt(cat.spend)}/mo</span></span>
                      <span style={{fontFamily:MO,fontSize:12,fontWeight:700,color:RD}}>Leak: {fmt(cat.leak)}/mo ({cat.pct}%)</span>
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
            <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T3,marginBottom:8}}>EXECUTIVE SUMMARY</p>
            <p style={{fontSize:13,color:T2,lineHeight:1.6}}>
              {COMPANY.name} spends <strong style={{color:T1}}>{fmt(COMPANY.monthlyIT)}/month</strong> across {COMPANY.tools} tools.
              Our analysis identified <strong style={{color:RD}}>{fmt(SCORE.ghostTax)}/year</strong> in recoverable Ghost Tax ({SCORE.leakPct}% of total spend).
              At entropy κ={SCORE.kappa} and peer position P{SCORE.peerPct}, operational coordination drag is amplifying waste.
              The top 5 recovery actions can reclaim <strong style={{color:TL}}>{fmt(totalRecoverable,true)}/year</strong> starting immediately.
            </p>
          </div>
        </div>)}

        {/* ANOMALIES TAB */}
        {tab==="anomalies"&&(<div style={Object.assign({},gl,{padding:16})}>
          <p style={{fontSize:13,fontWeight:600,marginBottom:12}}>{ANOMALIES.length} anomalies detected across {COMPANY.tools} tools</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {ANOMALIES.map(function(a){return(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:8,background:sevBg[a.sev],border:"1px solid "+sevCol[a.sev]+"14"}}>
                <span style={{fontSize:8,fontFamily:MO,fontWeight:600,padding:"3px 7px",borderRadius:4,background:sevCol[a.sev]+"18",border:"1px solid "+sevCol[a.sev]+"30",color:sevCol[a.sev],textTransform:"uppercase",letterSpacing:".04em",flexShrink:0}}>{a.sev}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:12,fontWeight:600,color:T1,marginBottom:2}}>{a.title}</p>
                  <p style={{fontSize:10,color:T3}}>{a.vendor} · {a.type}</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{fontFamily:MO,fontSize:14,fontWeight:800,color:sevCol[a.sev]}}>{fmt(a.impactMo)}<span style={{fontSize:8}}>/mo</span></p>
                  <p style={{fontSize:8,color:T3}}>{fmt(a.impactYr)}/yr</p>
                </div>
              </div>
            );})}
          </div>
        </div>)}

        {/* ACTIONS TAB */}
        {tab==="actions"&&(<div style={Object.assign({},gl,{padding:16})}>
          <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:A,marginBottom:6}}>PROFIT RECOVERY PROTOCOL</p>
          <p style={{fontSize:16,fontWeight:700,marginBottom:14}}>5 actions. {fmt(totalRecoverable,true)} recoverable per year.</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {RECS.map(function(r){
              var efCol=r.effort==="Easy"?TL:OR;
              return(
                <div key={r.rank} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:"rgba(0,0,0,0.12)",border:"1px solid rgba(36,48,78,0.14)"}}>
                  <div style={{width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.18)",fontFamily:MO,fontSize:13,fontWeight:800,color:A,flexShrink:0}}>{r.rank}</div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:T1,marginBottom:3}}>{r.title}</p>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{fontSize:8,fontFamily:MO,padding:"2px 6px",borderRadius:3,background:efCol+"12",border:"1px solid "+efCol+"22",color:efCol}}>{r.effort}</span>
                      <span style={{fontSize:9,color:T3}}>~{r.days} days</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontFamily:MO,fontSize:16,fontWeight:800,color:TL}}>{fmt(r.savings,true)}</p>
                    <p style={{fontSize:8,color:T3}}>per year</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:14,padding:"10px 14px",borderRadius:7,background:"rgba(52,211,153,0.04)",border:"1px solid rgba(52,211,153,0.12)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:T2}}>Total recoverable</span>
            <span style={{fontFamily:MO,fontSize:16,fontWeight:800,color:TL}}>{fmt(totalRecoverable)}/yr</span>
          </div>
        </div>)}

        {/* EXPORT TAB */}
        {tab==="export"&&(<div style={Object.assign({},gl,{padding:18})}>
          <p style={{fontSize:9,fontFamily:MO,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:A,marginBottom:8}}>EXPORT OPTIONS</p>
          <p style={{fontSize:14,fontWeight:700,marginBottom:14}}>Share this report with your team.</p>
          <pre style={{fontFamily:MO,fontSize:9,lineHeight:1.6,color:T2,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"rgba(0,0,0,0.2)",padding:14,borderRadius:8,border:"1px solid rgba(36,48,78,0.18)",maxHeight:300,overflow:"auto",marginBottom:14}}>
            {genSummaryText()}
          </pre>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>
            <button onClick={function(){var b=new Blob([genSummaryText()],{type:"text/plain"});var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download="valuguard-sample-report.txt";a.click();URL.revokeObjectURL(u);}} style={{padding:"11px 22px",borderRadius:8,border:"none",background:A,color:"#fff",fontSize:11,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase",cursor:"pointer"}}>
              DOWNLOAD SUMMARY
            </button>
            <button onClick={function(){if(navigator.clipboard)navigator.clipboard.writeText(genSummaryText());}} style={{padding:"11px 18px",borderRadius:8,border:"1px solid "+BD,background:"transparent",color:T2,fontSize:11,cursor:"pointer"}}>
              COPY TO CLIPBOARD
            </button>
          </div>
        </div>)}

        {/* BOTTOM CTA */}
        <div style={Object.assign({},gl,{padding:22,marginTop:14,textAlign:"center"})}>
          <p style={{fontSize:14,fontWeight:700,marginBottom:6}}>{t("sample.cta.title1")} <span style={{color:TL}}>{t("sample.cta.title2")}</span></p>
          <p style={{fontSize:12,color:T2,marginBottom:16,lineHeight:1.5,maxWidth:400,margin:"0 auto 16px"}}>
            {t("sample.cta.sub")}
          </p>
          <a href="/estimator" style={{display:"inline-block",padding:"13px 26px",borderRadius:8,background:TL,color:V,fontSize:12,fontWeight:800,letterSpacing:".05em",textTransform:"uppercase",textDecoration:"none"}}>
            {t("sample.cta")}
          </a>
        </div>

        {/* TRUST FOOTER */}
        <div style={{marginTop:16,padding:"11px 14px",borderRadius:10,border:"1px solid "+BD,background:"rgba(11,14,24,0.35)",display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          {[{i:"🛡",t:"SOC2 Type II Ready"},{i:"🔐",t:"Zero-Knowledge Audit"},{i:"🇺🇸",t:"US Data Residency"},{i:"⏱",t:"30-Day Auto-Delete"}].map(function(b){return(<div key={b.t} style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:T2}}><span style={{fontSize:13}}>{b.i}</span><span style={{fontWeight:600}}>{b.t}</span></div>);})}
        </div>

      </div>
    </div>
  );
}
