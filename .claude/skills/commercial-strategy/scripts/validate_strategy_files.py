#!/usr/bin/env python3
"""
Ghost Tax — Commercial Strategy File Validator
Checks all required files exist and contain expected sections.
Exit code 0 = all pass, 1 = issues found.

Usage:
    python validate_strategy_files.py
    python validate_strategy_files.py --verbose
    python validate_strategy_files.py --skill-dir /path/to/commercial-strategy
"""

import sys
import os
import re
import argparse
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    file_path: str
    exists: bool
    missing_sections: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    line_count: int = 0


# ── Required files and their expected sections ──────────────────────────

REQUIRED_FILES: dict[str, dict] = {
    # Skill definition
    "SKILL.md": {
        "sections": [],  # No specific sections required, just must exist
        "min_lines": 10,
        "description": "Skill definition file",
    },
    # Deliverables
    "deliverables/doctrine.md": {
        "sections": [
            "First Principles",
            "Revenue",
            "Proof",
            "Anti-Patterns",
        ],
        "min_lines": 50,
        "description": "Strategic doctrine",
    },
    "deliverables/buyer-psychology.md": {
        "sections": [
            "Decision Process",
            "Trust",
            "Emotional",
            "Objection",
        ],
        "min_lines": 50,
        "description": "Buyer psychology framework",
    },
    "deliverables/hypothesis-testing.md": {
        "sections": [
            "Hypothesis",
            "Test",
            "Measure",
            "Kill Criteria",
        ],
        "min_lines": 30,
        "description": "Hypothesis testing framework",
    },
    "deliverables/channel-playbooks.md": {
        "sections": [
            "Channel",
            "Priority",
            "Budget",
            "Metric",
        ],
        "min_lines": 40,
        "description": "Channel playbooks",
    },
    "deliverables/trigger-map.md": {
        "sections": [
            "Trigger",
            "Detection",
            "Action",
            "Score",
        ],
        "min_lines": 40,
        "description": "Trigger-to-action map",
    },
    "deliverables/proof-architecture.md": {
        "sections": [
            "Proof",
            "Flywheel",
            "Anti-Proof",
            "Timeline",
        ],
        "min_lines": 40,
        "description": "Proof architecture",
    },
    # Examples
    "examples/ghost-tax-master-strategy.md": {
        "sections": [
            "Phase 1",
            "Phase 2",
            "Phase 3",
            "ICP",
            "Kill Criteria",
        ],
        "min_lines": 100,
        "description": "Master strategy example",
    },
    "examples/ghost-tax-cfo-emotional-map.md": {
        "sections": [
            "Daily Reality",
            "Trigger",
            "Trust",
            "EUR 490",
        ],
        "min_lines": 80,
        "description": "CFO emotional map example",
    },
    "examples/ghost-tax-proof-architecture.md": {
        "sections": [
            "Month 0",
            "Flywheel",
            "Anti-Proof",
            "Ranked",
        ],
        "min_lines": 80,
        "description": "Proof architecture example",
    },
    "examples/ghost-tax-trigger-system.md": {
        "sections": [
            "Trigger",
            "Apollo",
            "LinkedIn",
            "Score",
        ],
        "min_lines": 80,
        "description": "Trigger system example",
    },
    # Scripts
    "scripts/validate_strategy_files.py": {
        "sections": [],
        "min_lines": 20,
        "description": "This validator script",
    },
    "scripts/hypothesis_strength_score.py": {
        "sections": [],
        "min_lines": 20,
        "description": "Hypothesis scoring script",
    },
    "scripts/drift_review.py": {
        "sections": [],
        "min_lines": 20,
        "description": "Strategy drift review script",
    },
}


def find_skill_dir(override: str | None = None) -> Path:
    """Locate the commercial-strategy skill directory."""
    if override:
        return Path(override)

    # Try common locations
    candidates = [
        Path("C:/Users/edith/Desktop/Ghost-tax/Claude/.claude/skills/commercial-strategy"),
        Path(__file__).parent.parent,  # If running from scripts/
        Path.cwd() / ".claude" / "skills" / "commercial-strategy",
    ]
    for candidate in candidates:
        if candidate.exists() and (candidate / "SKILL.md").exists():
            return candidate

    # Fall back to script's parent's parent
    return Path(__file__).resolve().parent.parent


def check_sections(content: str, required_sections: list[str]) -> list[str]:
    """Check if content contains expected section keywords (case-insensitive)."""
    content_lower = content.lower()
    missing = []
    for section in required_sections:
        if section.lower() not in content_lower:
            missing.append(section)
    return missing


def validate_file(skill_dir: Path, rel_path: str, spec: dict) -> ValidationResult:
    """Validate a single file against its specification."""
    full_path = skill_dir / rel_path
    result = ValidationResult(file_path=rel_path, exists=full_path.exists())

    if not result.exists:
        return result

    try:
        content = full_path.read_text(encoding="utf-8")
    except Exception as e:
        result.warnings.append(f"Could not read file: {e}")
        return result

    lines = content.strip().splitlines()
    result.line_count = len(lines)

    # Check minimum lines
    min_lines = spec.get("min_lines", 0)
    if result.line_count < min_lines:
        result.warnings.append(
            f"Only {result.line_count} lines (minimum expected: {min_lines})"
        )

    # Check required sections
    required_sections = spec.get("sections", [])
    if required_sections:
        result.missing_sections = check_sections(content, required_sections)

    # Check for stale date references (warn if file mentions specific dates older than 90 days)
    date_pattern = re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b", re.IGNORECASE)
    dates_found = date_pattern.findall(content)
    if dates_found:
        result.warnings.append(f"Contains date references: {', '.join(set(dates_found))} — verify freshness")

    # Check for empty sections (heading followed immediately by another heading)
    empty_section_pattern = re.compile(r"^(#{1,4}\s+.+)\n+(#{1,4}\s+.+)", re.MULTILINE)
    empty_sections = empty_section_pattern.findall(content)
    if empty_sections:
        result.warnings.append(f"Potentially empty sections detected: {len(empty_sections)}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Ghost Tax commercial strategy files")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument("--skill-dir", type=str, default=None, help="Path to commercial-strategy skill directory")
    args = parser.parse_args()

    skill_dir = find_skill_dir(args.skill_dir)
    print(f"Skill directory: {skill_dir}")
    print(f"Directory exists: {skill_dir.exists()}")
    print()

    if not skill_dir.exists():
        print("ERROR: Skill directory not found.")
        return 1

    results: list[ValidationResult] = []
    for rel_path, spec in REQUIRED_FILES.items():
        result = validate_file(skill_dir, rel_path, spec)
        results.append(result)

    # ── Report ──
    total = len(results)
    missing_files = [r for r in results if not r.exists]
    files_with_missing_sections = [r for r in results if r.missing_sections]
    files_with_warnings = [r for r in results if r.warnings]

    passed = total - len(missing_files) - len(files_with_missing_sections)

    print("=" * 60)
    print("GHOST TAX — STRATEGY FILE VALIDATION REPORT")
    print("=" * 60)
    print()

    # Missing files
    if missing_files:
        print(f"MISSING FILES ({len(missing_files)}):")
        for r in missing_files:
            desc = REQUIRED_FILES[r.file_path].get("description", "")
            print(f"  ✗ {r.file_path} — {desc}")
        print()

    # Files with missing sections
    if files_with_missing_sections:
        print(f"INCOMPLETE FILES ({len(files_with_missing_sections)}):")
        for r in files_with_missing_sections:
            print(f"  ⚠ {r.file_path}")
            for section in r.missing_sections:
                print(f"    Missing section keyword: '{section}'")
        print()

    # Warnings
    if args.verbose and files_with_warnings:
        print(f"WARNINGS ({len(files_with_warnings)}):")
        for r in files_with_warnings:
            print(f"  {r.file_path}:")
            for w in r.warnings:
                print(f"    → {w}")
        print()

    # Passed files
    if args.verbose:
        passed_files = [r for r in results if r.exists and not r.missing_sections]
        if passed_files:
            print(f"PASSED ({len(passed_files)}):")
            for r in passed_files:
                print(f"  ✓ {r.file_path} ({r.line_count} lines)")
            print()

    # Summary
    print("-" * 60)
    has_issues = bool(missing_files or files_with_missing_sections)
    status = "FAIL" if has_issues else "PASS"
    print(f"Result: {status}")
    print(f"  Files checked:  {total}")
    print(f"  Missing:        {len(missing_files)}")
    print(f"  Incomplete:     {len(files_with_missing_sections)}")
    print(f"  Warnings:       {sum(len(r.warnings) for r in results)}")
    print(f"  Passed:         {passed}")

    return 1 if has_issues else 0


if __name__ == "__main__":
    sys.exit(main())
