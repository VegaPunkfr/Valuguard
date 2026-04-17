import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Impressum / Mentions légales — Ghost Tax. Informations légales conformément au §5 TMG (Allemagne), Telemediengesetz.",
  robots: { index: true, follow: true },
};

/**
 * Impressum page — obligatoire pour les marchés DACH
 *
 * Conformité :
 * - Allemagne : §5 Telemediengesetz (TMG)
 * - Autriche : §25 Mediengesetz
 * - Suisse : Art. 322 CO (mentions du prestataire)
 *
 * Créée 17-18 avril 2026 (P0 audit). Mise à jour au besoin quand Ghost Tax
 * formalise son entité (SAS/GmbH), numéro RCS, VAT ID, etc.
 */
export default function ImprintPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>
        Impressum · Mentions légales
      </h1>
      <p style={{ fontSize: 13, color: "#94a3b8", fontFamily: "var(--vg-font-mono)", marginBottom: 40 }}>
        Last updated : 17 April 2026
      </p>

      <Section title="Publisher / Responsable de la publication">
        <p><strong>Ghost Tax</strong></p>
        <p>Hélène Jean-Étienne (Founder &amp; Managing Director)</p>
        <p>Status : Sole proprietorship (micro-entrepreneur), France</p>
        <p>Business address available on request at <a href="mailto:legal@ghost-tax.com">legal@ghost-tax.com</a></p>
      </Section>

      <Section title="Contact">
        <p>Email : <a href="mailto:contact@ghost-tax.com">contact@ghost-tax.com</a></p>
        <p>Legal / Data : <a href="mailto:legal@ghost-tax.com">legal@ghost-tax.com</a></p>
        <p>Privacy / GDPR : <a href="mailto:privacy@ghost-tax.com">privacy@ghost-tax.com</a></p>
      </Section>

      <Section title="VAT / Tax registration">
        <p>
          VAT ID : not yet applicable (below turnover threshold for VAT registration).
          Pricing is displayed excluding any applicable VAT. VAT will be charged where legally required
          once registration thresholds are reached.
        </p>
      </Section>

      <Section title="Content responsibility / Verantwortlich für den Inhalt">
        <p>Ghost Tax — Hélène Jean-Étienne, address as above.</p>
        <p>
          Responsible for editorial content according to §55 Abs. 2 RStV (Germany) and equivalent
          regulations in Austria and Switzerland.
        </p>
      </Section>

      <Section title="Dispute resolution / Streitbeilegung">
        <p>
          European Commission Online Dispute Resolution platform :{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
        </p>
        <p>
          Ghost Tax is not obliged and not willing to participate in dispute resolution procedures
          before a consumer arbitration board. For complaints, contact legal@ghost-tax.com.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          The content of our website has been created with utmost care. However, we cannot guarantee
          the accuracy, completeness, or topicality of the content. As a service provider, we are
          responsible for our own content on these pages in accordance with general laws.
        </p>
      </Section>

      <Section title="Copyright">
        <p>
          The content and compilation of works on these pages created by Ghost Tax are subject to
          European and French copyright. Duplication, editing, distribution, and any form of
          exploitation beyond the limits of copyright law require the written consent of the author.
        </p>
      </Section>

      <p style={{ marginTop: 64, fontSize: 12, color: "#64748b" }}>
        <a href="/legal/privacy">Privacy Policy</a> &middot;{" "}
        <a href="/legal/terms">Terms of Service</a> &middot;{" "}
        <a href="/">← Back to Ghost Tax</a>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#e2e8f0" }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>{children}</div>
    </section>
  );
}
