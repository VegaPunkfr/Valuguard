#!/usr/bin/env python3
"""
Ghost Tax — Strategy Drift Review
Reads strategy files, identifies elements that may be becoming obsolete,
and outputs a review checklist.

Checks for:
  - Date references that may have aged
  - Market assumptions that need revalidation
  - Competitor references that may be outdated
  - Pricing/budget assumptions that may have changed
  - Metric targets that may need updating
  - External data citations that may be stale

Usage:
    python drift_review.py
    python drift_review.py --verbose
    python drift_review.py --skill-dir /path/to/commercial-strategy
    python drift_review.py --max-age-days 60
"""

import sys
import os
import re
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, field


@dataclass
class DriftItem:
    file: str
    line_number: int
    category: str
    severity: str  # HIGH, MEDIUM, LOW
    text: str
    recommendation: str


# ── Date patterns ──────────────────────────────────────────────────────

MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    # German months
    "januar": 1, "februar": 2, "märz": 3, "mai": 5, "juni": 6,
    "juli": 7, "oktober": 10, "dezember": 12,
}

DATE_PATTERNS = [
    # "March 2026", "April 2025", etc.
    re.compile(r"\b(" + "|".join(MONTH_NAMES.keys()) + r")\s+(\d{4})\b", re.IGNORECASE),
    # "Q1 2026", "Q4 2025"
    re.compile(r"\bQ([1-4])\s+(\d{4})\b", re.IGNORECASE),
    # "2025", "2026" standalone year references
    re.compile(r"\bin\s+(\d{4})\b"),
]

# ── Market assumptions to flag ─────────────────────────────────────────

MARKET_ASSUMPTIONS = [
    # Stats that go stale
    (r"42%\s*(of|des)\s*(enterprises|entreprises|companies)", "42% enterprises cutting SaaS budgets"),
    (r"12\.2%\s*(SaaS|inflation)", "SaaS inflation 12.2% stat"),
    (r"90%\s*(manage|gèrent|of\s+organizations)", "90% FinOps adoption stat"),
    (r"\$?\d+[BM]\s*(FinOps|SaaS\s*management)\s*market", "FinOps market size"),
    (r"Gartner|Forrester|IDC|Flexera", "Analyst firm reference — verify report is current"),
]

# ── Competitor references ──────────────────────────────────────────────

COMPETITOR_PATTERNS = [
    (r"\bZylo\b", "Zylo", "Check: current pricing, features, market position"),
    (r"\bProductiv\b", "Productiv", "Check: still active? recent funding? product changes?"),
    (r"\bBig\s*4\b", "Big 4", "Check: any new mid-market SaaS audit offerings?"),
    (r"\bFlexera\b", "Flexera", "Check: any SMB-focused product launches?"),
    (r"\bVertice\b", "Vertice", "Check: current positioning, pricing"),
    (r"\bCledara\b", "Cledara", "Check: market expansion, new features"),
    (r"\bSastrify\b", "Sastrify", "Check: still DACH-focused? pricing changes?"),
]

# ── Pricing/budget assumptions ─────────────────────────────────────────

PRICING_PATTERNS = [
    (r"EUR\s*490\b|€\s*490\b", "Rail A standard pricing"),
    (r"EUR\s*590\b|€\s*590\b", "Rail A DACH pricing"),
    (r"EUR\s*4[.,]?990\b|€\s*4[.,]?990\b", "Rail B pricing"),
    (r"EUR\s*49\b.*(?:month|budget|Apollo)", "Apollo budget assumption"),
    (r"385\s*credits", "Apollo credit allocation"),
    (r"EUR\s*50[Kk]|€\s*50[Kk]", "Zylo pricing reference"),
    (r"EUR\s*[28]0[0-9]*[Kk].*Big\s*4", "Big 4 pricing reference"),
]

# ── Metric targets ────────────────────────────────────────────────────

METRIC_PATTERNS = [
    (r"(\d+)%\s*reply\s*rate", "Reply rate target — validate against actual data"),
    (r"(\d+)%\s*conversion", "Conversion rate target — validate against actual data"),
    (r"(\d+)\s*Rail\s*A.*month", "Rail A volume target — realistic?"),
    (r"(\d+)\s*beta\s*client", "Beta client target — achieved?"),
    (r"EUR\s*[\d,.]+[KkMm]?\s*(?:revenue|cumulative|run\s*rate)", "Revenue projection — on track?"),
    (r"zero\s*(?:paying\s*)?customer|no\s*(?:paying\s*)?customer", "Zero customer claim — still true?"),
]

# ── Files to scan ─────────────────────────────────────────────────────

SCAN_EXTENSIONS = {".md", ".txt"}


def find_skill_dir(override: str | None = None) -> Path:
    """Locate the commercial-strategy skill directory."""
    if override:
        return Path(override)
    candidates = [
        Path("C:/Users/edith/Desktop/Ghost-tax/Claude/.claude/skills/commercial-strategy"),
        Path(__file__).parent.parent,
        Path.cwd() / ".claude" / "skills" / "commercial-strategy",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return Path(__file__).resolve().parent.parent


def parse_month_year(month_str: str, year_str: str) -> datetime | None:
    """Parse a month name and year into a datetime."""
    month_str = month_str.lower()
    if month_str in MONTH_NAMES:
        try:
            return datetime(int(year_str), MONTH_NAMES[month_str], 1)
        except (ValueError, KeyError):
            return None
    return None


def check_date_freshness(content: str, lines: list[str], max_age_days: int) -> list[tuple[int, str, str]]:
    """Find date references and flag old ones."""
    findings: list[tuple[int, str, str]] = []
    now = datetime.now()
    cutoff = now - timedelta(days=max_age_days)

    for i, line in enumerate(lines, 1):
        # Month Year pattern
        for match in re.finditer(
            r"\b(" + "|".join(MONTH_NAMES.keys()) + r")\s+(\d{4})\b",
            line,
            re.IGNORECASE,
        ):
            dt = parse_month_year(match.group(1), match.group(2))
            if dt and dt < cutoff:
                age_months = (now.year - dt.year) * 12 + now.month - dt.month
                findings.append((
                    i,
                    match.group(0),
                    f"Reference is ~{age_months} months old (>{max_age_days} days)",
                ))
            elif dt and dt > now + timedelta(days=365):
                findings.append((
                    i,
                    match.group(0),
                    "Future date reference — speculative projection?",
                ))

        # Quarter Year pattern
        for match in re.finditer(r"\bQ([1-4])\s+(\d{4})\b", line, re.IGNORECASE):
            quarter = int(match.group(1))
            year = int(match.group(2))
            quarter_start = datetime(year, (quarter - 1) * 3 + 1, 1)
            if quarter_start < cutoff:
                findings.append((
                    i,
                    match.group(0),
                    f"Quarter reference may be stale (>{max_age_days} days old)",
                ))

    return findings


def scan_patterns(
    lines: list[str],
    patterns: list[tuple],
    category: str,
    severity: str,
) -> list[tuple[int, str, str]]:
    """Scan lines for regex patterns and return findings."""
    findings: list[tuple[int, str, str]] = []
    for i, line in enumerate(lines, 1):
        for pattern_tuple in patterns:
            pattern = pattern_tuple[0]
            label = pattern_tuple[1]
            recommendation = pattern_tuple[2] if len(pattern_tuple) > 2 else f"Review: {label}"
            if re.search(pattern, line, re.IGNORECASE):
                findings.append((i, label, recommendation))
    return findings


def analyze_file(filepath: Path, max_age_days: int) -> list[DriftItem]:
    """Analyze a single file for drift signals."""
    items: list[DriftItem] = []
    rel_path = filepath.name

    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return items

    lines = content.splitlines()

    # 1. Date freshness
    for line_num, text, rec in check_date_freshness(content, lines, max_age_days):
        items.append(DriftItem(
            file=rel_path, line_number=line_num,
            category="STALE DATE", severity="MEDIUM",
            text=text, recommendation=rec,
        ))

    # 2. Market assumptions
    for line_num, text, rec in scan_patterns(lines, MARKET_ASSUMPTIONS, "MARKET", "HIGH"):
        items.append(DriftItem(
            file=rel_path, line_number=line_num,
            category="MARKET ASSUMPTION", severity="HIGH",
            text=text, recommendation=f"Verify current data: {rec}",
        ))

    # 3. Competitor references
    for line_num, text, rec in scan_patterns(lines, COMPETITOR_PATTERNS, "COMPETITOR", "MEDIUM"):
        items.append(DriftItem(
            file=rel_path, line_number=line_num,
            category="COMPETITOR REF", severity="MEDIUM",
            text=text, recommendation=rec,
        ))

    # 4. Pricing/budget
    for line_num, text, rec in scan_patterns(lines, PRICING_PATTERNS, "PRICING", "LOW"):
        items.append(DriftItem(
            file=rel_path, line_number=line_num,
            category="PRICING/BUDGET", severity="LOW",
            text=text, recommendation=f"Verify current: {rec}",
        ))

    # 5. Metric targets
    for line_num, text, rec in scan_patterns(lines, METRIC_PATTERNS, "METRIC", "MEDIUM"):
        items.append(DriftItem(
            file=rel_path, line_number=line_num,
            category="METRIC TARGET", severity="MEDIUM",
            text=text, recommendation=rec,
        ))

    return items


def deduplicate_items(items: list[DriftItem]) -> list[DriftItem]:
    """Remove duplicate findings (same file + category + text)."""
    seen: set[tuple[str, str, str]] = set()
    unique: list[DriftItem] = []
    for item in items:
        key = (item.file, item.category, item.text)
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def main() -> int:
    parser = argparse.ArgumentParser(description="Ghost Tax strategy drift review")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--skill-dir", type=str, default=None)
    parser.add_argument("--max-age-days", type=int, default=90, help="Flag dates older than N days (default: 90)")
    args = parser.parse_args()

    skill_dir = find_skill_dir(args.skill_dir)
    print(f"Scanning: {skill_dir}")
    print(f"Max age threshold: {args.max_age_days} days")
    print(f"Current date: {datetime.now().strftime('%Y-%m-%d')}")
    print()

    if not skill_dir.exists():
        print("ERROR: Directory not found.")
        return 1

    # Collect all scannable files
    all_files: list[Path] = []
    for ext in SCAN_EXTENSIONS:
        all_files.extend(skill_dir.rglob(f"*{ext}"))

    if not all_files:
        print("No strategy files found to scan.")
        return 0

    print(f"Found {len(all_files)} files to scan.\n")

    # Analyze all files
    all_items: list[DriftItem] = []
    for filepath in sorted(all_files):
        items = analyze_file(filepath, args.max_age_days)
        all_items.extend(items)

    all_items = deduplicate_items(all_items)

    if not all_items:
        print("No drift signals detected. Strategy files appear current.")
        return 0

    # Sort by severity
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    all_items.sort(key=lambda x: (severity_order.get(x.severity, 3), x.category, x.file))

    # ── Output ──
    print("=" * 70)
    print("GHOST TAX — STRATEGY DRIFT REVIEW")
    print("=" * 70)

    # Group by severity
    for severity in ["HIGH", "MEDIUM", "LOW"]:
        items = [i for i in all_items if i.severity == severity]
        if not items:
            continue

        severity_label = {
            "HIGH": "HIGH PRIORITY — Review immediately",
            "MEDIUM": "MEDIUM PRIORITY — Review this week",
            "LOW": "LOW PRIORITY — Review monthly",
        }[severity]

        print(f"\n{'─' * 70}")
        print(f"  {severity_label} ({len(items)} items)")
        print(f"{'─' * 70}")

        # Group by category within severity
        categories: dict[str, list[DriftItem]] = {}
        for item in items:
            categories.setdefault(item.category, []).append(item)

        for category, cat_items in categories.items():
            print(f"\n  [{category}]")
            for item in cat_items:
                print(f"    □ {item.text}")
                print(f"      File: {item.file}, line {item.line_number}")
                if args.verbose:
                    print(f"      → {item.recommendation}")

    # ── Summary ──
    print(f"\n{'=' * 70}")
    print("REVIEW CHECKLIST SUMMARY")
    print(f"{'=' * 70}")

    high = sum(1 for i in all_items if i.severity == "HIGH")
    medium = sum(1 for i in all_items if i.severity == "MEDIUM")
    low = sum(1 for i in all_items if i.severity == "LOW")

    print(f"  Total items:    {len(all_items)}")
    print(f"  HIGH priority:  {high}")
    print(f"  MEDIUM priority: {medium}")
    print(f"  LOW priority:   {low}")
    print()

    # Category breakdown
    cat_counts: dict[str, int] = {}
    for item in all_items:
        cat_counts[item.category] = cat_counts.get(item.category, 0) + 1

    print("  By category:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"    {cat:<20} {count}")

    # ── Actionable checklist ──
    print(f"\n{'─' * 70}")
    print("  RECOMMENDED ACTIONS")
    print(f"{'─' * 70}")

    if high > 0:
        print("\n  1. MARKET ASSUMPTIONS: Run a web search for current stats on:")
        market_items = [i for i in all_items if i.category == "MARKET ASSUMPTION"]
        for item in market_items[:5]:
            print(f"     - {item.text}")

    competitor_items = [i for i in all_items if i.category == "COMPETITOR REF"]
    if competitor_items:
        competitors = list({i.text for i in competitor_items})
        print(f"\n  2. COMPETITOR CHECK: Verify current status of: {', '.join(competitors)}")

    stale_dates = [i for i in all_items if i.category == "STALE DATE"]
    if stale_dates:
        print(f"\n  3. STALE DATES: {len(stale_dates)} date references may need updating")

    metric_items = [i for i in all_items if i.category == "METRIC TARGET"]
    if metric_items:
        print(f"\n  4. METRICS: {len(metric_items)} targets to validate against actual performance")

    zero_customer = any(i for i in all_items if "zero customer" in i.text.lower() or "no customer" in i.text.lower())
    if zero_customer:
        print("\n  5. CRITICAL: 'Zero customer' claims still present — update when first sale happens!")

    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
