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
  console.error("RESEND_API_KEY manquante dans .env.local");
  process.exit(1);
}

const to = process.argv[2] || "hashirama973@gmail.com";
const from = process.argv[3] || "Ghost Tax Test <reports@ghost-tax.com>";
const replyTo = process.argv[4] || "hashirama973@gmail.com";

const subject = "Test canal Ghost Tax — " + new Date().toISOString().slice(0, 16);

const body = `Salut Edith,

Ceci est un test automatique envoyé depuis Claude Code pour vérifier :

1. Le canal d'envoi Resend fonctionne (domaine ghost-tax.com autorisé)
2. Les emails arrivent bien en inbox
3. Le reply_to est réellement joignable

Timestamp: ${new Date().toISOString()}
From: ${from}
Reply-To: ${replyTo}

Action demandée : clique "Répondre" à ce mail et envoie n'importe quoi.
- Si ta réponse arrive quelque part, le canal est complet.
- Si tu reçois un bounce "address not found", on a confirmé que reply_to audits@ghost-tax.com est bien cassé en prod.

Claude Code`;

console.log(`[test-send] Sending email...`);
console.log(`  to       : ${to}`);
console.log(`  from     : ${from}`);
console.log(`  reply_to : ${replyTo}`);
console.log(`  subject  : ${subject}`);

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
console.log(`\n[test-send] HTTP ${res.status}`);
console.log(JSON.stringify(json, null, 2));

if (res.ok) {
  console.log(`\n✅ Email envoyé. ID Resend : ${json.id}`);
  console.log(`   Va checker hashirama973@gmail.com dans 30 secondes.`);
} else {
  console.log(`\n❌ Envoi échoué. Probablement :`);
  console.log(`   - Domaine from non autorisé dans Resend`);
  console.log(`   - Clé API invalide ou révoquée`);
  console.log(`   - Rate limit`);
  process.exit(1);
}
