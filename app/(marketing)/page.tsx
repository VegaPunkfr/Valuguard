"use client";

import { useState, useEffect, useRef } from "react";

/*  VALUGUARD — PAGE D'ACCUEIL (FR 2026)
    Hub de conversion. Chaque section a un objectif :
    transformer le DAF de "c'est quoi ?" en "JE VEUX MON AUDIT".
    100% EUR. 100% Francais. Zero anglais. */

const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

// ── Scroll reveal ──────────────────────────────────
function useReveal(th: number) {
  const ref = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(function () {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      function (entries) { if (entries[0].isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: th || 0.1 }
    );
    obs.observe(el);
    return function () { obs.disconnect(); };
  }, [th]);
  return [ref, vis] as const;
}

function Section(props: { delay?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  const result = useReveal(0.08);
  const ref = result[0];
  const vis = result[1];
  const d = props.delay || 0;
  return (
    <section ref={ref as React.Ref<HTMLElement>} style={Object.assign({
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(18px)",
      transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) " + d + "ms",
      marginBottom: 48,
    }, props.style || {})}>
      {props.children}
    </section>
  );
}

function Label(props: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", fontSize: 9, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: A, marginBottom: 10 }}>
      {props.children}
    </span>
  );
}

// ── Moteur de detection ────────────────────────────
const DETECTIONS = [
  { icon: "\u{1F47B}", title: "Licences inactives", desc: "Postes pay\u00e9s pour des collaborateurs partis ou inactifs depuis plus de 90 jours." },
  { icon: "\u{1F504}", title: "Outils redondants", desc: "Plusieurs outils pour le m\u00eame usage. 3 outils d'\u00e9criture IA ? C'est une taxe fant\u00f4me." },
  { icon: "\u{1F4D0}", title: "Plans surdimensionn\u00e9s", desc: "Abonnements Enterprise pour des \u00e9quipes qui n'utilisent que les fonctions basiques." },
  { icon: "\u{1F3F4}", title: "Shadow IT", desc: "Outils achet\u00e9s sans validation IT. Aucune n\u00e9gociation. Aucune remise volume." },
  { icon: "\u{1F916}", title: "D\u00e9rive IA", desc: "Consommation de tokens API en croissance exponentielle, sans gouvernance ni plafond." },
  { icon: "\u{1F4C9}", title: "Engagements sous-utilis\u00e9s", desc: "Contrats annuels utilis\u00e9s \u00e0 moins de 60% de leur capacit\u00e9. Argent bloqu\u00e9 et perdu." },
];

// ── Comment ca marche ──────────────────────────────
const STEPS = [
  { num: "01", title: "Exportez", desc: "T\u00e9l\u00e9chargez vos fichiers de facturation CSV. Vous gardez le contr\u00f4le total.", time: "5 min" },
  { num: "02", title: "Importez", desc: "Import chiffr\u00e9 dans notre coffre-fort. Protocole Zero-Knowledge, aucun acc\u00e8s API n\u00e9cessaire.", time: "2 min" },
  { num: "03", title: "Analysez", desc: "8 d\u00e9tecteurs d\u00e9terministes scannent 12 types de fuites. R\u00e9sultats sous 48 heures.", time: "48h" },
  { num: "04", title: "R\u00e9cup\u00e9rez", desc: "Plan de r\u00e9cup\u00e9ration class\u00e9 par montant. Pr\u00e9sentable au Board le jour m\u00eame.", time: "Imm\u00e9diat" },
];

// ── Tarification ───────────────────────────────────
const PRICING = [
  {
    name: "Audit Ghost Tax",
    price: "990\u20ac",
    period: "unique",
    desc: "Diagnostic complet de vos d\u00e9penses SaaS, Cloud et IA.",
    features: ["D\u00e9tection de 12 types de fuites", "Score d'entropie + benchmark sectoriel", "5 actions de r\u00e9cup\u00e9ration prioritaires", "Synth\u00e8se ex\u00e9cutive pour le Board", "Livraison sous 48h"],
    cta: "LANCER L'AUDIT",
    highlight: false,
  },
  {
    name: "Basique",
    price: "490\u20ac",
    period: "/mois",
    desc: "Surveillance continue et alertes de gouvernance.",
    features: ["Scans automatis\u00e9s mensuels", "Alertes nouvelles anomalies", "Tableau de bord de suivi", "Revue strat\u00e9gique trimestrielle", "Sp\u00e9cialiste r\u00e9cup\u00e9ration d\u00e9di\u00e9"],
    cta: "SOUSCRIRE",
    highlight: false,
  },
  {
    name: "Expert",
    price: "990\u20ac",
    period: "/mois",
    desc: "Gouvernance FinOps compl\u00e8te pour les \u00e9quipes en croissance.",
    features: ["Tout le plan Basique inclus", "Audit temps r\u00e9el", "Assurance conformit\u00e9 incluse", "Support d\u00e9di\u00e9 sous 2h", "N\u00e9gociation fournisseurs", "Reporting FinOps ex\u00e9cutif"],
    cta: "CONTACTER UN EXPERT",
    highlight: true,
  },
];

// ── FAQ ────────────────────────────────────────────
const FAQ = [
  { q: "Combien une entreprise \u00e9conomise-t-elle en moyenne ?", a: "Les entreprises de 50 \u00e0 500 employ\u00e9s d\u00e9couvrent g\u00e9n\u00e9ralement que 15 \u00e0 25% de leur budget IT est r\u00e9cup\u00e9rable. Pour un budget de 50k\u20ac/mois, cela repr\u00e9sente 90k\u20ac \u00e0 150k\u20ac par an." },
  { q: "Quelles donn\u00e9es sont n\u00e9cessaires ?", a: "Des exports de facturation (CSV/XLSX) et des inventaires de licences. Nous n'avons jamais besoin de mots de passe, de cl\u00e9s API ou d'acc\u00e8s \u00e0 vos syst\u00e8mes de production." },
  { q: "En quoi est-ce diff\u00e9rent d'un tableur ?", a: "Un tableur ne peut pas d\u00e9tecter la redondance Shadow IA, calculer l'entropie organisationnelle, ni vous comparer \u00e0 7 secteurs d'activit\u00e9. Notre moteur ex\u00e9cute 8 d\u00e9tecteurs sur 12 types de fuites en quelques secondes." },
  { q: "Mes donn\u00e9es sont-elles en s\u00e9curit\u00e9 ?", a: "Chiffrement AES-256 au repos, TLS 1.3 en transit. H\u00e9bergement europ\u00e9en. Suppression automatique apr\u00e8s 30 jours. Architecture SOC2 Type II. Consultez notre Coffre-fort S\u00e9curit\u00e9 pour tous les d\u00e9tails." },
  { q: "Et si l'audit ne trouve pas assez d'\u00e9conomies ?", a: "Si notre audit identifie moins de 3x son co\u00fbt en d\u00e9penses r\u00e9cup\u00e9rables, nous continuons le travail jusqu'\u00e0 ce que ce soit le cas \u2014 ou nous remboursons la diff\u00e9rence. Cela n'est jamais arriv\u00e9." },
  { q: "Combien de temps faut-il ?", a: "Vous exportez et importez en moins de 10 minutes. Nous livrons le rapport complet sous 48 heures. Les premi\u00e8res actions de r\u00e9cup\u00e9ration sont applicables dans la semaine." },
];

// ── Chiffres de confiance ──────────────────────────
const TRUST_STATS = [
  { value: "18x", label: "ROI moyen de l'audit" },
  { value: "12", label: "Types de fuites d\u00e9tect\u00e9s" },
  { value: "48h", label: "Livraison du rapport" },
  { value: "0\u20ac", label: "Aucun acc\u00e8s syst\u00e8me requis" },
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(-1);

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px" }}>

        {/* ═══════ NAVBAR ═══════ */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid " + BD }}>
          <a href="/" style={{ fontSize: 12, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A, textDecoration: "none" }}>VALUGUARD</a>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <a href="/methodology" style={{ fontSize: 12, color: T2, textDecoration: "none", fontWeight: 500 }}>M&eacute;thodologie</a>
            <a href="#pricing" style={{ fontSize: 12, color: T2, textDecoration: "none", fontWeight: 500 }}>Tarifs</a>
            <a href="/security-vault" style={{ fontSize: 12, color: T2, textDecoration: "none", fontWeight: 500 }}>S&eacute;curit&eacute;</a>
            <a href="/sample-report" style={{ fontSize: 12, color: T2, textDecoration: "none", fontWeight: 500 }}>Exemple de rapport</a>
            <a href="/estimator" style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: A, padding: "7px 16px", borderRadius: 7, textDecoration: "none", letterSpacing: ".03em" }}>
              LANCER L&apos;AUDIT
            </a>
          </div>
        </nav>

        {/* ═══════ HERO ═══════ */}
        <Section style={{ textAlign: "center", paddingTop: 64, paddingBottom: 48 }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 16 }}>
            MONITEUR DE FUITES IT &amp; IA
          </p>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            Exposez votre{" "}
            <span style={{ color: RD }}>Taxe Fant&ocirc;me IA.</span>
            <br />
            R&eacute;cup&eacute;rez votre marge en{" "}
            <span style={{ fontFamily: MO, color: TL }}>48h.</span>
          </h1>
          <p style={{ fontSize: 16, color: T2, maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Prolif&eacute;ration SaaS, Shadow IA et d&eacute;penses Cloud non gouvern&eacute;es drainent silencieusement 15 &agrave; 25% de votre budget IT.
            Nous les trouvons, les quantifions, et vous montrons exactement comment les r&eacute;cup&eacute;rer.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <a href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
              D&Eacute;COUVRIR MA TAXE FANT&Ocirc;ME &rarr;
            </a>
            <a href="/sample-report" style={{ display: "inline-block", padding: "14px 24px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Voir un exemple de rapport
            </a>
          </div>
        </Section>

        {/* ═══════ CHIFFRES CL&Eacute;S ═══════ */}
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {TRUST_STATS.map(function (stat) {
              return (
                <div key={stat.label} style={Object.assign({}, gl, { padding: 16, textAlign: "center" as const })}>
                  <p style={{ fontFamily: MO, fontSize: 26, fontWeight: 800, color: AH, lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, color: T3, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ LE PROBL&Egrave;ME ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>LE TUEUR SILENCIEUX DE MARGE</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>
              Chaque mois d&apos;attente, <span style={{ color: RD }}>la Taxe Fant&ocirc;me s&apos;accumule.</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
              {[
                { amt: "2 400\u20ac/mois", label: "Gaspill\u00e9s en licences inactives en moyenne", color: RD },
                { amt: "1 800\u20ac/mois", label: "Perdus en outils dupliqu\u00e9s et redondants", color: OR },
                { amt: "3 100\u20ac/mois", label: "Br\u00fbl\u00e9s par la consommation IA non gouvern\u00e9e", color: RD },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ padding: 16, borderRadius: 9, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
                    <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.amt}</p>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.4 }}>{item.label}</p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: T3, textAlign: "center", marginTop: 16, fontFamily: MO }}>
              Bas&eacute; sur les m&eacute;dianes constat&eacute;es dans les entreprises de 50 &agrave; 500 employ&eacute;s. Sources : Flexera, Zylo, Gartner 2024-25.
            </p>
          </div>
        </Section>

        {/* ═══════ MOTEUR DE D&Eacute;TECTION ═══════ */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>CE QUE NOTRE MOTEUR D&Eacute;TECTE</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>12 types de fuites. 8 d&eacute;tecteurs. Z&eacute;ro angle mort.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {DETECTIONS.map(function (d) {
              return (
                <div key={d.title} style={Object.assign({}, gl, { padding: 16 })}>
                  <span style={{ fontSize: 22 }}>{d.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T1, marginTop: 8, marginBottom: 4 }}>{d.title}</h3>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ COMMENT &Ccedil;A MARCHE ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>COMMENT &Ccedil;A MARCHE</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Du CSV au rapport Board en 48 heures.</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {STEPS.map(function (step) {
                return (
                  <div key={step.num} style={{ padding: 16, borderRadius: 10, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", position: "relative" }}>
                    <div style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: "rgba(59,130,246,0.08)", position: "absolute", top: 10, right: 14 }}>{step.num}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 4 }}>{step.title}</h3>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 8 }}>{step.desc}</p>
                    <span style={{ fontSize: 9, fontFamily: MO, color: TL, fontWeight: 600 }}>{step.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ TARIFS ═══════ */}
        <Section>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>TARIFS</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Transparents. Sans surprise. ROI garanti.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PRICING.map(function (tier) {
              return (
                <div key={tier.name} style={Object.assign({}, gl, {
                  padding: 22,
                  borderColor: tier.highlight ? TL + "40" : BD,
                  position: "relative" as const,
                })}>
                  {tier.highlight && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontFamily: MO, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: TL, color: V, letterSpacing: ".06em", textTransform: "uppercase" }}>
                      RECOMMAND&Eacute;
                    </div>
                  )}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 8 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: MO, fontSize: 30, fontWeight: 800, color: tier.highlight ? TL : AH }}>{tier.price}</span>
                    <span style={{ fontSize: 12, color: T3 }}>{tier.period}</span>
                  </div>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 14 }}>{tier.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {tier.features.map(function (f) {
                      return (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T2 }}>
                          <span style={{ color: TL, fontSize: 10, fontWeight: 700 }}>&check;</span>
                          {f}
                        </div>
                      );
                    })}
                  </div>
                  <button style={{
                    width: "100%", padding: "11px", borderRadius: 7, border: "none",
                    background: tier.highlight ? TL : "rgba(59,130,246,0.08)",
                    color: tier.highlight ? V : AH,
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                    cursor: "pointer",
                  }}>
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: T3, textAlign: "center", marginTop: 14 }}>
            Prix par mois, factur&eacute; annuellement. Remise de 20% sur les plans Basique et Expert en engagement annuel.
          </p>
        </Section>

        {/* ═══════ FAQ ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 24 })}>
            <Label>QUESTIONS FR&Eacute;QUENTES</Label>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Les vraies questions. Des r&eacute;ponses directes.</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FAQ.map(function (item, i) {
                const open = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 8, border: "1px solid " + (open ? A + "28" : "rgba(36,48,78,0.14)"), background: open ? "rgba(59,130,246,0.03)" : "rgba(0,0,0,0.08)", overflow: "hidden", transition: "all 0.2s" }}>
                    <button
                      onClick={function () { setOpenFaq(open ? -1 : i); }}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: T1, fontSize: 13, fontWeight: 600, textAlign: "left", fontFamily: SA }}
                    >
                      <span>{item.q}</span>
                      <span style={{ fontSize: 11, color: T3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: 10 }}>&blacktriangledown;</span>
                    </button>
                    {open && (
                      <div style={{ padding: "0 14px 14px", fontSize: 12, color: T2, lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ CTA FINAL ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 32, textAlign: "center" as const })}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 8 }}>
              CHAQUE MOIS SANS AUDIT VOUS CO&Ucirc;TE 7 300&euro;+ EN MOYENNE
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Stoppez l&apos;h&eacute;morragie. <span style={{ color: TL }}>R&eacute;cup&eacute;rez votre marge.</span>
            </h2>
            <p style={{ fontSize: 14, color: T2, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.5 }}>
              L&apos;Audit Ghost Tax est rentabilis&eacute; d&egrave;s la premi&egrave;re semaine.
              ROI moyen : 18x. R&eacute;cup&eacute;ration typique : 100k&euro;+ par an.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <a id="audit" href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
                LANCER MON AUDIT &mdash; 990&euro;
              </a>
              <a href="mailto:audits@valuguard.com" style={{ display: "inline-block", padding: "14px 22px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, textDecoration: "none" }}>
                Parler &agrave; un expert
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════ FOOTER ═══════ */}
        <footer style={{ borderTop: "1px solid " + BD, padding: "32px 0", marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: MO, fontWeight: 700, color: A, letterSpacing: ".06em" }}>VALUGUARD</span>
              <p style={{ fontSize: 11, color: T3, marginTop: 6, maxWidth: 240, lineHeight: 1.5 }}>
                Moniteur de fuites IT &amp; IA. Nous r&eacute;v&eacute;lons o&ugrave; l&apos;argent fuit, combien cela co&ucirc;te, et quoi corriger en priorit&eacute;.
              </p>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Produit</p>
                {[
                  { label: "Audit Ghost Tax", href: "/estimator" },
                  { label: "M\u00e9thodologie", href: "/methodology" },
                  { label: "Exemple de rapport", href: "/sample-report" },
                  { label: "Tarifs", href: "#pricing" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Confiance</p>
                {[
                  { label: "Coffre-fort S\u00e9curit\u00e9", href: "/security-vault" },
                  { label: "Politique de confidentialit\u00e9", href: "/security-vault" },
                  { label: "Conditions d'utilisation", href: "/security-vault" },
                  { label: "Contact DPO", href: "mailto:security@valuguard.com" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Ressources</p>
                {[
                  { label: "Analyse Peer-Gap", href: "/peer-gap" },
                  { label: "Rapport ROI", href: "/roi-report" },
                  { label: "Estimateur", href: "/estimator" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none" }}>{link.label}</a>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid " + BD, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { icon: "\u{1F6E1}", title: "SOC2 Type II Ready" },
                { icon: "\u{1F510}", title: "Zero-Knowledge" },
                { icon: "\u{1F1EA}\u{1F1FA}", title: "H\u00e9bergement EU" },
                { icon: "\u23F1", title: "Purge 30 jours" },
              ].map(function (b) {
                return (
                  <span key={b.title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: T3 }}>
                    <span style={{ fontSize: 12 }}>{b.icon}</span>{b.title}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: 9, color: T3 }}>
              &copy; 2026 Valuguard SAS. Tous droits r&eacute;serv&eacute;s.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
