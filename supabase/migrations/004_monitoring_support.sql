-- ============================================================
-- GHOST TAX — MIGRATION 004: monitoring_reports TABLE
-- Monthly drift reports for monitoring subscribers
-- ============================================================

CREATE TABLE IF NOT EXISTS monitoring_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  audit_request_id uuid REFERENCES audit_requests(id),
  report_month date NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  drift_summary jsonb DEFAULT '{}',
  vendor_alerts jsonb DEFAULT '[]',
  exposure_delta_eur numeric(12,2),
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE(audit_request_id, report_month)
);

ALTER TABLE monitoring_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_monitoring_reports_org ON monitoring_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_month ON monitoring_reports(report_month);
