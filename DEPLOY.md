# Ghost Tax — Deployment Guide

## Prerequisites

- Node.js >= 20
- Supabase project (PostgreSQL 15 + pgvector)
- Stripe account (test or live)
- Exa API key
- OpenAI API key
- Resend account (verified domain: ghost-tax.com)
- Vercel account (recommended) or any Next.js hosting

## 1. Database Setup

Run migrations in order against your Supabase project:

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manual (SQL Editor in Supabase Dashboard)
# Run each file in supabase/migrations/ in numeric order:
#   001_vault_schema.sql    — core tables, RLS, triggers
#   002_vector_tables.sql   — pgvector table + similarity RPC
#   003_delivery_columns.sql — delivery pipeline columns on audit_requests
```

Verify: `SELECT * FROM audit_requests LIMIT 0;` should show columns including `run_id`, `domain`, `report_data`, `delivered_at`, `followup_at`.

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill all REQUIRED values.

On Vercel: add each variable in Project Settings → Environment Variables.

**Required for core operation:**
| Variable | Where used | What breaks without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | All DB features disabled |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | All DB features disabled |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Delivery pipeline, vector store |
| `STRIPE_SECRET_KEY` | Server only | Checkout, webhook |
| `STRIPE_WEBHOOK_SECRET` | Server only | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Not currently used in code but reserved |
| `EXA_API_KEY` | Server only | Company enrichment returns empty |
| `OPENAI_API_KEY` | Server only | Vectors use hash fallback (not production-grade) |
| `RESEND_API_KEY` | Server only | Emails logged to console, not sent |
| `NEXT_PUBLIC_SITE_URL` | Server + client | Stripe redirects go to localhost |

## 3. Stripe Webhook

Register webhook in Stripe Dashboard → Developers → Webhooks:

- **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
- **Events to listen for:** `checkout.session.completed`, `payment_intent.payment_failed`
- **Copy the signing secret** to `STRIPE_WEBHOOK_SECRET`

Test with Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 4. Resend Domain Verification

In Resend Dashboard:
1. Add domain `ghost-tax.com`
2. Add DNS records (DKIM, SPF, DMARC)
3. Verify sending works

Emails are sent from: `reports@ghost-tax.com` (delivery) and `notifications@ghost-tax.com` (transactional).

## 5. Deploy

```bash
# Vercel (recommended)
vercel --prod

# Or manual
npm run build && npm start
```

## 6. Post-Deploy Verification

1. Visit `/intel` — enter a test domain, verify streaming analysis works
2. Click checkout CTA — verify Stripe checkout opens with domain in metadata
3. Complete test payment — verify webhook fires and delivery pipeline runs
4. Check Supabase `audit_requests` — verify row with `status = 'delivered'` and `report_data` populated
5. Check email — verify report arrives

## 7. Follow-up Scheduling

The delivery pipeline sets `followup_at` (14 days after delivery) on each `audit_requests` row. To activate follow-up emails, set up a cron job:

**Option A: Supabase pg_cron**
```sql
SELECT cron.schedule('ghost-tax-followup', '0 9 * * *',
  $$ SELECT id, email, run_id FROM audit_requests
     WHERE followup_at <= now()
     AND status = 'delivered' $$
);
```
Then process results via Edge Function or external worker.

**Option B: Vercel Cron**
Add to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/followup", "schedule": "0 9 * * *" }] }
```
Then create the cron route to query and send follow-up emails.

## Architecture

```
User → /intel (preview) → /api/intel (streaming NDJSON)
     → checkout CTA → /api/stripe/checkout (Stripe session)
     → Stripe payment → webhook → /api/stripe/webhook
                                  → executeDeliveryPipeline()
                                    → Exa enrichment
                                    → Intelligence pipeline (21 phases)
                                    → Build StructuredReport
                                    → Persist to audit_requests.report_data
                                    → Send email via Resend
                                    → Set followup_at
```
