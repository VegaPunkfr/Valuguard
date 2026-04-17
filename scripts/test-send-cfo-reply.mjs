import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const envRaw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const apiKey = env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY manquante");
  process.exit(1);
}

const to = "hashirama973@gmail.com";
const from = "Markus Weber (via Ghost Tax SIM) <reports@ghost-tax.com>";
const replyTo = "hashirama973@gmail.com";
const subject = "Re: Companies like Bauhaus GmbH are already acting on this";

const body = `Guten Tag,

Mail reçu hier. Quelques questions directes avant toute suite.

1. Sur quelles données publiques exactement basez-vous votre estimation
   d'exposition pour Bauhaus GmbH ? J'ai besoin de la méthodologie
   complète avant de regarder un quelconque chiffre.

2. Comment avez-vous obtenu mon adresse professionnelle ?
   Notre DPO va me poser la question.

3. Nous avons déjà un responsable FinOps interne + un cabinet
   externe sur les renégociations annuelles. En quoi votre offre
   se différencie au-delà d'un benchmark ?

4. Le "scan gratuit" produit quel livrable exactement ?
   5 pages marketing ou une analyse défendable devant mon Vorstand ?

Réponse brève suffit. Si pas de méthodologie claire, inutile de poursuivre.

Mit freundlichen Grüßen,
Markus Weber
CFO — Bauhaus GmbH
+49 30 XXXX XXXX

---
[CECI EST UN ROLEPLAY — pas un vrai CFO]

Salut Edith, c'est Claude.

Je viens de t'envoyer ce mail en simulant la réponse réaliste d'un
CFO allemand à ton Touch 3 ("Companies like [Company] are already
acting on this").

Observe bien :
- Le ton est sec, pas agressif mais pas chaleureux
- Les 4 questions tuent 80% des outreach vendors immédiatement
- RGPD + méthodologie + différenciation + livrable concret
- "Réponse brève suffit" = test de clarté

Cet archétype représente ~60% des replies CFO DACH que tu recevras
quand ton reply-handling sera fixé.

Maintenant : rédige ta réponse dans Gmail. Tu peux me la coller ici
et je te donnerai un feedback Fellow-level sur :
- Le ton (trop commercial ? trop humble ?)
- La structure (tu réponds aux 4 questions ou tu pivotes ?)
- Le CTA (tu pousses vers scan ? vers call ? vers rien ?)
- Les red flags à éviter sur un CFO DACH

Bon entraînement.
Claude`;

console.log(`[sim-cfo-reply] Sending roleplay email...`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    reply_to: replyTo,
    subject,
    text: body,
  }),
});

const json = await res.json();
console.log(`\n[sim-cfo-reply] HTTP ${res.status}`);
console.log(JSON.stringify(json, null, 2));

if (res.ok) {
  console.log(`\n✅ Roleplay CFO envoyé. ID : ${json.id}`);
} else {
  console.log(`\n❌ Envoi échoué`);
  process.exit(1);
}
